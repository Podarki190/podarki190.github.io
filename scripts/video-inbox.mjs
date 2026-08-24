// Приёмник сырых роликов. Павел снимает на телефон и отправляет видео прямо в
// личку боту @lazerklin_publisher_bot — скрипт забирает файлы отсюда.
//
// Почему через Telegram, а не по проводу: снимать и отправлять можно откуда
// угодно, ничего не теряется, и телефон сам сжимает ролик при отправке. Это
// важно: Bot API отдаёт скачивание файлов только до 20 МБ, а сырой ролик с
// телефона весит впятеро больше. Поэтому отправлять надо ОБЫЧНЫМ ВИДЕО, а не
// «как файл» — «как файл» шлёт оригинал и упрётся в лимит.
//
// Прочитанные обновления Telegram отдаёт один раз, поэтому позицию храним в
// video-inbox-state.json: иначе повторный запуск либо заберёт всё заново, либо
// пропустит присланное между запусками.

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const INBOX = path.join(ROOT, 'video-inbox');
const STATE = path.join(ROOT, 'video-inbox-state.json');
const MAX_BOT_DOWNLOAD = 20 * 1024 * 1024;

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('нет TELEGRAM_BOT_TOKEN');

const api = async (method, params = {}) => {
  const res = await (await fetch(`https://api.telegram.org/bot${token}/${method}?${new URLSearchParams(params)}`)).json();
  if (!res.ok) throw new Error(`${method}: ${res.description}`);
  return res.result;
};

async function readState() {
  try { return JSON.parse(await readFile(STATE, 'utf8')); } catch { return { offset: 0 }; }
}

// Ролик приходит как video (сжатый телефоном) или как document (отправлен
// «файлом»). Второй случай ловим отдельно, чтобы сказать человеку понятное,
// а не молчать: файл почти наверняка окажется больше лимита.
function extractVideo(update) {
  const msg = update.message ?? update.channel_post;
  if (!msg) return null;
  if (msg.video) return { ...msg.video, kind: 'video', date: msg.date, caption: msg.caption };
  if (msg.document?.mime_type?.startsWith('video/')) {
    return { ...msg.document, kind: 'document', date: msg.date, caption: msg.caption };
  }
  return null;
}

async function download(fileId, dest) {
  const { file_path: filePath } = await api('getFile', { file_id: fileId });
  const res = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
  if (!res.ok) throw new Error(`скачивание: HTTP ${res.status}`);
  await pipeline(res.body, createWriteStream(dest));
}

async function main() {
  const state = await readState();
  const updates = await api('getUpdates', { offset: state.offset, timeout: 0, limit: 100 });
  if (!updates.length) {
    console.log('новых роликов нет');
    return;
  }

  await mkdir(INBOX, { recursive: true });
  let taken = 0;
  for (const update of updates) {
    state.offset = update.update_id + 1;
    const video = extractVideo(update);
    if (!video) continue;

    const mb = (video.file_size / 1024 / 1024).toFixed(1);
    if (video.file_size > MAX_BOT_DOWNLOAD) {
      console.log(`пропускаю ${mb} МБ — Bot API отдаёт только до 20 МБ.`);
      console.log('  отправьте этот ролик обычным видео, а не «как файл»: телефон сожмёт его сам');
      continue;
    }

    // Запоминаем, откуда прислали: чтобы потом отправить готовый ролик обратно
    // тому же человеку. Бот умеет писать только тем, кто написал ему первым.
    state.chatId = (update.message ?? update.channel_post).chat.id;

    const stamp = new Date(video.date * 1000).toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const dest = path.join(INBOX, `${stamp}.mp4`);
    await download(video.file_id, dest);
    taken += 1;
    console.log(`принят ${path.basename(dest)} — ${mb} МБ, ${video.width}x${video.height}, ${video.duration} с`);
    if (video.caption) console.log(`  подпись: ${video.caption}`);
  }

  await writeFile(STATE, `${JSON.stringify(state, null, 2)}\n`);
  console.log(taken ? `всего принято: ${taken}` : 'видео среди новых сообщений не было');
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
