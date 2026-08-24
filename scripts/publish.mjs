// Раздача поста дня по соцсетям. Запускается раз в сутки; берёт запись, у
// которой дата — сегодняшняя по Москве, и кладёт её в Telegram и ВКонтакте.
// Дзен ничего не требует: он сам забирает опубликованное из Telegram.
//
// Что уже отправлено — записано в publish-state.json, и файл коммитится
// обратно. Без этого повторный запуск за те же сутки продублировал бы пост, а
// в ВК это необратимо: wall.delete групповому ключу недоступен, и лишнюю
// запись пришлось бы убирать руками.
//
// Прогон без отправки: node scripts/publish.mjs --dry-run

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { POSTS } from '../src/blog.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATE_FILE = path.join(ROOT, 'publish-state.json');

const VK_GROUP_ID = 106929053;
const VK_API = 'https://api.vk.com/method';
const VK_VERSION = '5.199';

const dryRun = process.argv.includes('--dry-run');
const log = (...args) => console.log(dryRun ? '[вхолостую]' : '[публикация]', ...args);

// ── ВКонтакте ────────────────────────────────────────────────────────────────

async function vk(method, params, token) {
  const query = new URLSearchParams({ ...params, v: VK_VERSION, access_token: token });
  const data = await (await fetch(`${VK_API}/${method}?${query}`)).json();
  if (data.error) {
    throw new Error(`ВК ${method}: ${data.error.error_msg} (код ${data.error.error_code})`);
  }
  return data.response;
}

// Фотографий здесь нет и быть не может — это проверено, а не предположено.
// Групповому ключу закрыты и photos.getWallUploadServer, и photos.saveWallPhoto
// (обе — ошибка 27). Открыт photos.getMessagesUploadServer, но фото из скрытого
// альбома сообщений стена молча выбрасывает: запись создаётся, вложения в ней
// нет. С access_key — то же самое. Токен пользователя эту дверь открыл бы, но
// у приложения типа «мини-приложение» нет права offline, и такой токен живёт
// сутки — для ночной задачи бесполезен.
//
// Поэтому вложение — ссылка на статью, а карточку с картинкой ВК строит сам из
// og:image. Одна фотография вместо трёх, зато без ручной работы. Ссылка при
// этом обязана быть в записи, а не в комментарии: комментарий не даёт картинки,
// а запись без картинки в ленте не замечают вовсе.
async function publishToVk(post, url, token) {
  const { post_id: postId } = await vk('wall.post', {
    owner_id: -VK_GROUP_ID,
    from_group: 1,
    message: post.vk,
    attachments: url,
  }, token);

  return `https://vk.com/wall-${VK_GROUP_ID}_${postId}`;
}

// ── Telegram ─────────────────────────────────────────────────────────────────

// Подпись альбома ограничена 1024 знаками и живёт на первой картинке. Она же
// уезжает в Дзен: первое предложение станет заголовком статьи, первое фото —
// обложкой. Поэтому ссылка идёт внутри текста, а не отдельным сообщением —
// иначе в Дзене её просто не будет.
const TG_CAPTION_LIMIT = 1024;

async function publishToTelegram(post, files, url, token, channel) {
  const caption = `${post.tg}\n\n${url}`;
  if (caption.length > TG_CAPTION_LIMIT) {
    throw new Error(`Telegram: подпись ${caption.length} знаков при лимите ${TG_CAPTION_LIMIT}`);
  }

  const form = new FormData();
  const media = files.map((file, i) => ({
    type: 'photo',
    media: `attach://photo${i}`,
    ...(i === 0 ? { caption } : {}),
  }));
  form.append('chat_id', channel);
  form.append('media', JSON.stringify(media));
  for (const [i, file] of files.entries()) {
    form.append(`photo${i}`, new Blob([await readFile(file)], { type: 'image/jpeg' }), `${i + 1}.jpg`);
  }

  const res = await (await fetch(`https://api.telegram.org/bot${token}/sendMediaGroup`,
    { method: 'POST', body: form })).json();
  if (!res.ok) throw new Error(`Telegram: ${res.description}`);
  return `https://t.me/${channel.replace('@', '')}/${res.result[0].message_id}`;
}

// ── Что публикуем ────────────────────────────────────────────────────────────

function moscowToday(now = new Date()) {
  return new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function readState() {
  try {
    return JSON.parse(await readFile(STATE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

async function main() {
  const today = moscowToday();
  const post = POSTS.find(p => p.date === today);
  if (!post) {
    log(`на ${today} записей нет — публиковать нечего`);
    return;
  }

  const state = await readState();
  const done = state[post.slug] ?? {};
  const baseUrl = (process.env.SITE_BASE_URL || 'https://lazerklin.ru').replace(/\/+$/, '');
  const url = `${baseUrl}/blog/${post.slug}/`;
  const files = post.alts.map((_, i) => path.join(ROOT, 'static', 'blog', post.slug, `${i + 1}.jpg`));

  log(`пост дня: ${post.slug}`);
  log(`ссылка: ${url}`);

  const channel = process.env.TELEGRAM_CHANNEL || '@lazerklin_ru';
  const jobs = [
    ['tg', 'Telegram', () => publishToTelegram(post, files, url, process.env.TELEGRAM_BOT_TOKEN, channel)],
    ['vk', 'ВКонтакте', () => publishToVk(post, url, process.env.VK_GROUP_TOKEN)],
  ];

  // Площадки независимы: если упал Telegram, ВК всё равно должен выйти, а
  // упавшая площадка просто останется неотмеченной и уйдёт при следующем
  // запуске. Ошибку копим и роняем процесс в конце, чтобы Actions её показал.
  const failures = [];
  for (const [key, name, send] of jobs) {
    if (done[key]) { log(`${name}: уже отправлено ${done[key]}, пропускаю`); continue; }
    if (dryRun) { log(`${name}: отправил бы сейчас`); continue; }
    try {
      const link = await send();
      done[key] = link;
      log(`${name}: ${link}`);
    } catch (err) {
      failures.push(`${name}: ${err.message}`);
      console.error(`[ошибка] ${name}: ${err.message}`);
    }
  }

  if (!dryRun) {
    state[post.slug] = done;
    await writeFile(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
  }

  if (failures.length) throw new Error(failures.join('; '));
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
