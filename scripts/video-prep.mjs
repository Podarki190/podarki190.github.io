// Готовит снятый на телефон ролик к публикации: обрезает, подкладывает музыку,
// выравнивает громкость и сжимает.
//
//   node scripts/video-prep.mjs video-inbox/2026-08-24.mp4 --dur 24
//   node scripts/video-prep.mjs <файл> --start 3 --dur 20 --music trek.mp3 --out out.mp4
//
// Чего здесь намеренно нет:
//
// Апскейла. Телефон при отправке в Telegram уже отдал 720x1280, и растягивание
// до 1080 не добавит ни одной детали — только вес. Вертикальный кадр остаётся
// как есть, приводится только тот, что пришёл не в 9:16.
//
// Стабилизации. В сборке ffmpeg есть vidstab, но на быстрых проводках камерой
// он даёт «плавание» хуже самой тряски. Включается флагом --stab, когда съёмка
// действительно дёрганая, а не по умолчанию.

import { spawn } from 'node:child_process';
import { readdir, stat, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MUSIC_DIR = process.env.MUSIC_DIR
  || path.join(process.env.USERPROFILE || process.env.HOME || '', 'Desktop', 'Музыка для роликов');

// Громкость под ленты соцсетей. -14 LUFS — то, к чему платформы всё равно
// приводят звук сами; отдавая громче, получаешь только их компрессор поверх.
const LOUDNESS = '-14';
const FADE_IN = 1;
const FADE_OUT = 1.5;

const ffmpeg = process.env.FFMPEG || 'ffmpeg';
const ffprobe = process.env.FFPROBE || 'ffprobe';

function run(bin, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { windowsHide: true });
    let err = '';
    child.stderr.on('data', (d) => { err += d; });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve(out.trim())
      : reject(new Error(`${path.basename(bin)} упал (${code}):\n${err.split('\n').slice(-8).join('\n')}`))));
  });
}

const probe = async (file, entries) => (await run(ffprobe, [
  '-v', 'error', '-show_entries', entries, '-of', 'default=noprint_wrappers=1:nokey=1', file,
])).split('\n').filter(Boolean);

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
}

async function pickMusic() {
  const explicit = arg('music');
  if (explicit) return path.resolve(explicit);
  let files = [];
  try {
    files = (await readdir(MUSIC_DIR)).filter(f => /\.(mp3|m4a|wav|ogg|flac)$/i.test(f));
  } catch { /* папки нет */ }
  if (!files.length) {
    throw new Error(`нет музыки. Положите треки в «${MUSIC_DIR}» или укажите --music <файл>`);
  }
  // По кругу, а не случайно: два ролика подряд под один трек выглядят халтурой,
  // а случайный выбор рано или поздно даёт именно такую пару.
  const index = Number(process.env.MUSIC_INDEX ?? Math.floor(Date.now() / 86400000)) % files.length;
  return path.join(MUSIC_DIR, files[index]);
}

async function main() {
  const input = process.argv[2];
  if (!input) throw new Error('укажите файл: node scripts/video-prep.mjs <видео>');

  const [width, height] = (await probe(input, 'stream=width,height')).map(Number);
  const sourceDur = Number((await probe(input, 'format=duration'))[0]);

  const start = Number(arg('start', 0));
  const dur = Math.min(Number(arg('dur', 24)), sourceDur - start);
  if (dur <= 0) throw new Error(`нечего резать: в ролике ${sourceDur.toFixed(1)} с, а начало задано на ${start} с`);

  const music = await pickMusic();
  const outDir = path.join(ROOT, 'video-out');
  await mkdir(outDir, { recursive: true });
  const out = arg('out') ?? path.join(outDir, `${path.basename(input, path.extname(input))}-готово.mp4`);

  // Вертикальный кадр оставляем как есть. Всё остальное вписываем в 9:16, а поля
  // заполняем размытой копией — так ничего не обрезается и нет чёрных полос,
  // которые ленты считают признаком перезалитого чужого видео.
  const vertical = height > width;
  const target = vertical ? `${width}:${height}` : '1080:1920';
  const fit = vertical
    ? 'null'
    : `split[bg][fg];[bg]scale=${target}:force_original_aspect_ratio=increase,crop=${target},gblur=sigma=24[bb];`
      + `[fg]scale=${target}:force_original_aspect_ratio=decrease[ff];[bb][ff]overlay=(W-w)/2:(H-h)/2`;

  const stab = process.argv.includes('--stab');
  const chain = [
    fit,
    stab ? 'deshake=rx=16:ry=16' : null,
    `fade=t=out:st=${(dur - 0.4).toFixed(2)}:d=0.4`,
    'format=yuv420p',
  ].filter(x => x && x !== 'null').join(',');

  const args = [
    '-v', 'error', '-stats',
    '-ss', String(start), '-t', String(dur), '-i', input,
    '-stream_loop', '-1', '-i', music,
    '-filter_complex', `[0:v]${chain}[v];`
      + `[1:a]loudnorm=I=${LOUDNESS}:TP=-1.5,afade=t=in:d=${FADE_IN},`
      + `afade=t=out:st=${(dur - FADE_OUT).toFixed(2)}:d=${FADE_OUT}[a]`,
    '-map', '[v]', '-map', '[a]', '-t', String(dur),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-movflags', '+faststart',
    '-c:a', 'aac', '-b:a', '128k', '-ar', '44100',
    out, '-y',
  ];

  console.log(`исходник : ${width}x${height}, ${sourceDur.toFixed(1)} с`);
  console.log(`берём    : с ${start} с, длительность ${dur} с`);
  console.log(`музыка   : ${path.basename(music)}`);
  if (stab) console.log('стабилизация: включена');

  await run(ffmpeg, args);

  const size = (await stat(out)).size;
  const [w, h] = (await probe(out, 'stream=width,height')).map(Number);
  console.log(`готово   : ${path.basename(out)} — ${w}x${h}, ${(size / 1024 / 1024).toFixed(1)} МБ`);
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
