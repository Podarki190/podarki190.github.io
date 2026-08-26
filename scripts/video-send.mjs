// Отправка готового ролика в Telegram-канал. Дальше он расходится сам:
// Дзен забирает из Telegram, Одноклассники — из Дзена.
//
//   node scripts/video-send.mjs video-out/moto-26s.mp4 --text "..."
//   node scripts/video-send.mjs <файл> --text-file подпись.txt --dry-run
//
// ВКонтакте в этой цепочке нет и не будет: video.save групповому ключу
// недоступен ровно так же, как загрузка фотографий. Ролики в ВК — руками.
//
// Подпись подчиняется тем же правилам, что и у фотопостов: не длиннее 1024
// знаков, первое предложение станет заголовком статьи в Дзене, поэтому оно
// должно быть коротким и читаться как заголовок.

import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const TG_CAPTION_LIMIT = 1024;
const DZEN_TITLE_LIMIT = 140;
const TG_UPLOAD_LIMIT = 50 * 1024 * 1024;

const token = process.env.TELEGRAM_BOT_TOKEN;
const channel = process.env.TELEGRAM_CHANNEL || '@lazerklin_ru';

// --to-me отправляет готовый ролик не в канал, а обратно тому, кто прислал
// исходник. Посмотреть с телефона проще, чем идти к компьютеру, а бот умеет
// писать только тем, кто написал ему первым, — поэтому чат и запоминается.
async function target() {
  if (!process.argv.includes('--to-me')) return channel;
  const state = JSON.parse(await readFile(new URL('../video-inbox-state.json', import.meta.url), 'utf8'));
  if (!state.chatId) throw new Error('чат неизвестен: напишите боту любое слово и запустите video-inbox.mjs');
  return String(state.chatId);
}

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
}

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('укажите файл: node scripts/video-send.mjs <видео> --text "подпись"');
  if (!token) throw new Error('нет TELEGRAM_BOT_TOKEN');

  const textFile = arg('text-file');
  const caption = (textFile ? await readFile(textFile, 'utf8') : arg('text', '')).trim();
  if (!caption) throw new Error('нужна подпись: без текста Дзен ролик не опубликует вовсе');
  if (caption.length > TG_CAPTION_LIMIT) {
    throw new Error(`подпись ${caption.length} знаков при лимите ${TG_CAPTION_LIMIT}`);
  }
  const first = caption.split('\n')[0];
  if (first.length > DZEN_TITLE_LIMIT) {
    throw new Error(`первая фраза ${first.length} знаков — в Дзене она станет заголовком, лимит ${DZEN_TITLE_LIMIT}`);
  }

  const { size } = await stat(file);
  if (size > TG_UPLOAD_LIMIT) throw new Error(`${(size / 1024 / 1024).toFixed(1)} МБ — бот отправляет до 50 МБ`);

  console.log(`файл    : ${path.basename(file)}, ${(size / 1024 / 1024).toFixed(1)} МБ`);
  console.log(`заголовок в Дзене: ${first}`);
  if (process.argv.includes('--dry-run')) {
    console.log('вхолостую — не отправляю');
    return;
  }

  const form = new FormData();
  form.append('chat_id', await target());
  form.append('caption', caption);
  // supports_streaming — ролик начинает играть до полной загрузки; без него
  // в ленте он выглядит как файл, который надо сначала скачать.
  form.append('supports_streaming', 'true');
  form.append('video', new Blob([await readFile(file)], { type: 'video/mp4' }), path.basename(file));

  const res = await (await fetch(`https://api.telegram.org/bot${token}/sendVideo`,
    { method: 'POST', body: form })).json();
  if (!res.ok) throw new Error(`Telegram: ${res.description}`);
  console.log(process.argv.includes('--to-me')
    ? 'отправлено вам в личку боту'
    : `отправлено: https://t.me/${channel.replace('@', '')}/${res.result.message_id}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
