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
import { fileURLToPath, pathToFileURL } from 'node:url';
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

// ВКонтакте получает только текст, и это не упрощение, а потолок группового
// ключа. Проверено по очереди, всё упирается в ошибку 27:
//   photos.getWallUploadServer, photos.saveWallPhoto — закрыты;
//   photos.getMessagesUploadServer открыт, но фото из скрытого альбома стена
//   молча выбрасывает — и с access_key тоже;
//   ссылка вложением даёт «link_photo_sizing_rule. No photo given», причём на
//   любой ссылке, хоть на Хабре: группе нечем приложить картинку к сниппету.
// Работает единственное — ссылка внутри текста, без вложения. Карточку ВК на
// неё не рисует, так что ссылка должна быть объяснена словами, иначе выглядит
// обрубком.
//
// Токен пользователя открыл бы всё это, но у приложения типа «мини-приложение»
// нет права offline: токен пришлось бы обновлять при каждом запуске и хранить
// обновлённый — то есть завести ключ с правом переписывать секреты репозитория.
// Ради картинок в одной соцсети это плохой размен, решено оставить текст.
const VK_PHOTO_LINE = 'Фотографии этой работы, размеры и сроки — на сайте:';

async function publishToVk(post, url, token) {
  const { post_id: postId } = await vk('wall.post', {
    owner_id: -VK_GROUP_ID,
    from_group: 1,
    message: `${post.vk}\n\n${VK_PHOTO_LINE}\n${url}`,
  }, token);

  return `https://vk.com/wall-${VK_GROUP_ID}_${postId}`;
}

// ── Telegram ─────────────────────────────────────────────────────────────────

// Подпись альбома ограничена 1024 знаками и живёт на первой картинке. Она же
// уезжает в Дзен: первое предложение станет заголовком статьи, первое фото —
// обложкой. Поэтому ссылка идёт внутри текста, а не отдельным сообщением —
// иначе в Дзене её просто не будет.
const TG_CAPTION_LIMIT = 1024;

// Ссылку добавляет публикатор, а не автор текста: она идёт с utm-метками и
// съедает часть лимита. Тест меряет ровно эту строку — раньше он мерил один
// post.tg и пропускал запись, которая падает уже при отправке.
export function tgCaption(post, url) {
  return `${post.tg}\n\n${url}`;
}

export function checkTgCaption(post, url) {
  const caption = tgCaption(post, url);
  if (caption.length > TG_CAPTION_LIMIT) {
    throw new Error(`Telegram: подпись ${caption.length} знаков при лимите ${TG_CAPTION_LIMIT}`);
  }
  return caption;
}

async function publishToTelegram(post, files, url, token, channel) {
  const caption = checkTgCaption(post, url);

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

// Метка источника в адресе. Нужна дважды: Метрика показывает, какая площадка
// реально приводит людей (Telegram чаще всего приходит без реферера и иначе
// выглядит как «прямой заход»), а ВКонтакте по адресу с меткой заново забирает
// страницу вместо своей закэшированной версии. Канонический адрес в разметке
// страницы остаётся чистым, так что поиску это ничем не грозит.
export const tagged = (url, source) => `${url}?utm_source=${source}&utm_medium=social`;

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
    ['tg', 'Telegram', () => publishToTelegram(post, files, tagged(url, 'telegram'), process.env.TELEGRAM_BOT_TOKEN, channel)],
    ['vk', 'ВКонтакте', () => publishToVk(post, tagged(url, 'vk'), process.env.VK_GROUP_TOKEN)],
  ];

  // Площадки независимы: если упал Telegram, ВК всё равно должен выйти, а
  // упавшая площадка просто останется неотмеченной и уйдёт при следующем
  // запуске. Ошибку копим и роняем процесс в конце, чтобы Actions её показал.
  const failures = [];
  for (const [key, name, send] of jobs) {
    if (done[key]) { log(`${name}: уже отправлено ${done[key]}, пропускаю`); continue; }
    if (dryRun) {
      // Предпросмотр обязан спотыкаться о то же, обо что споткнётся отправка.
      if (key === 'tg') checkTgCaption(post, tagged(url, 'telegram'));
      log(`${name}: отправил бы сейчас`);
      continue;
    }
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

// Запуск только при прямом вызове: тест импортирует отсюда сборку подписи,
// и импорт не должен ничего публиковать.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  });
}
