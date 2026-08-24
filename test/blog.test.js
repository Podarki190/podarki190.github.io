import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { POSTS, BLOG_INDEX, publishedPosts } from '../src/blog.js';
import { renderBlogIndex, renderBlogPost } from '../src/render.js';
import { SERVICES } from '../src/services.js';

import { tgCaption, tagged } from '../scripts/publish.mjs';

const TG_CAPTION_LIMIT = 1024;
const DZEN_TITLE_LIMIT = 140;

test('published posts are those whose day has come, newest first', () => {
  const now = new Date('2026-08-27T00:00:00Z');
  const slugs = publishedPosts(now).map(p => p.slug);
  assert.deepEqual(slugs, [
    'podstavka-pod-telefon-partiya',
    'chasy-sankt-peterburg',
    'medalnica-dlya-gimnastki',
    'tablichka-pereryv-do',
    'panno-mnogosloynoe',
  ]);
});

test('a post dated today is published in Moscow, not in UTC', () => {
  // 23:00 UTC — в Москве уже следующие сутки, и пост этого дня должен выйти.
  const post = POSTS.find(p => p.date === '2026-08-24');
  const beforeMidnightUtc = new Date('2026-08-23T23:00:00Z');
  assert.ok(publishedPosts(beforeMidnightUtc).includes(post));
});

test('every post carries three photos worth of alt text', () => {
  for (const post of POSTS) {
    assert.equal(post.alts.length, 3, `${post.slug}: ждём три подписи`);
    for (const alt of post.alts) assert.ok(alt.length > 20, `${post.slug}: подпись слишком куцая`);
  }
});

test('Telegram text fits the album caption and yields a sane Dzen title', () => {
  for (const post of POSTS) {
    // Меряем то, что реально уходит: публикатор дописывает ссылку с метками,
    // а это ещё под сотню знаков. Голый post.tg проходил бы проверку у записи,
    // которая падает уже при отправке — и терялась бы: выбор идёт по дате, и
    // второй попытки у поста не будет.
    const caption = tgCaption(post, tagged(`https://lazerklin.ru/blog/${post.slug}/`, 'telegram'));
    assert.ok(caption.length <= TG_CAPTION_LIMIT,
      `${post.slug}: подпись ${caption.length} знаков, лимит ${TG_CAPTION_LIMIT}`);
    // Дзен берёт заголовком первое предложение и не убирает его из тела —
    // длинная первая фраза даёт заголовок-простыню и заметный повтор.
    const first = post.tg.split('\n')[0];
    assert.ok(first.length <= DZEN_TITLE_LIMIT,
      `${post.slug}: первая фраза ${first.length} знаков, лимит ${DZEN_TITLE_LIMIT}`);
  }
});

test('photos exist for every post, including the ones still waiting', () => {
  // Сборка копирует фотографии только у вышедших записей. Забытый файл у
  // записи на две недели вперёд молча пройдёт все проверки, а потом уронит
  // ночную сборку в свой день — и сайт останется без обновления.
  for (const post of POSTS) {
    // og.jpg проверяем наравне со снимками: без него ВКонтакте не построит
    // карточку, а это единственная картинка, которую там увидят.
    for (const name of [...post.alts.map((_, i) => `${i + 1}.jpg`), 'og.jpg']) {
      const file = new URL(`../static/blog/${post.slug}/${name}`, import.meta.url);
      assert.ok(existsSync(file), `${post.slug}: нет файла ${name}`);
    }
  }
});

// Владелец 24.08.2026 снял вопрос по музыке и зарубежным исполнителям: у «Короля
// и Шута» наследница прав мерч разрешает, по остальному у него свои списки, и
// решение о снятии товара — его. Здесь осталась ровно та категория, которую он
// сам назвал защищаемой в России активно: кино, мультфильмы, персонажи. Список
// неполон по определению — он нужен, чтобы вопрос был задан, а не чтобы
// запретить. Расширять его без разговора с владельцем не надо.
const RIGHTS_MARKERS = [
  'marvel', 'disney', 'pixar', 'звёздные войны', 'звездные войны',
  'гарри поттер', 'человек-паук', 'бэтмен', 'мстител', 'холодное сердце',
  'смешарики', 'ну погоди', 'простокваш', 'винни-пух', 'чебурашк',
  'маша и медведь', 'фиксики', 'лунтик', 'три кота',
  'брат 2', 'бумер', 'джентльмены удачи', 'иван васильевич',
];

test('no post advertises a film or cartoon character', () => {
  for (const post of POSTS) {
    const haystack = `${post.slug} ${post.title} ${post.h1} ${post.description}`.toLowerCase();
    for (const marker of RIGHTS_MARKERS) {
      assert.ok(!haystack.includes(marker),
        `${post.slug}: «${marker}» — кино и мультфильмы защищают активно, `
        + 'по такому товару нужно решение владельца, а не автоматическая публикация');
    }
  }
});

test('every post points at services that actually exist', () => {
  // Опечатка в slug не ломает сборку: ссылка просто молча исчезает, а вместе с
  // ней и половина смысла блога — довести человека до страницы, где заказывают.
  const known = new Set(SERVICES.map(s => s.slug));
  for (const post of POSTS) {
    assert.ok(post.services?.length, `${post.slug}: не привязан ни к одной услуге`);
    for (const slug of post.services) {
      assert.ok(known.has(slug), `${post.slug}: услуги «${slug}» не существует`);
    }
  }
});

test('post pages link to their services and back to the blog', () => {
  const post = POSTS.find(p => p.slug === 'tablichka-pereryv-do');
  const html = renderBlogPost(post, 'abc123');
  assert.match(html, /\.\.\/\.\.\/uslugi\/tablichki-na-dveri\//);
  assert.match(html, /<a href="\.\.\/">← Все записи блога<\/a>/);
  assert.match(html, /<h1>Табличка/);
  // Пути к картинкам относительные: сайт может жить в подпапке.
  assert.match(html, /src="1\.jpg"/);
  assert.doesNotMatch(html, /src="\/blog/);
});

test('a post page carries an absolute Open Graph image and url', () => {
  // На этом держится карточка ВКонтакте: фотографии на стену групповому ключу
  // класть нельзя, и картинка в посте берётся ровно отсюда. Относительный
  // адрес не годится — соцсети неоткуда узнать наш домен.
  const post = POSTS.find(p => p.slug === 'tablichka-pereryv-do');
  const html = renderBlogPost(post, 'abc123');
  assert.match(html, /<meta property="og:image" content="https:\/\/lazerklin\.ru\/blog\/tablichka-pereryv-do\/og\.jpg">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/lazerklin\.ru\/blog\/tablichka-pereryv-do\/">/);
  assert.match(html, /<meta property="og:type" content="article">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/lazerklin\.ru\/blog\/tablichka-pereryv-do\/">/);
  assert.doesNotMatch(html, /og:image" content="(?!https:)/);
});

test('the blog index lists published posts and hides the future ones', () => {
  const html = renderBlogIndex('abc123', new Date('2026-08-25T00:00:00Z'));
  assert.match(html, /tablichka-pereryv-do\//);
  assert.doesNotMatch(html, /chasy-sankt-peterburg/);
});

test('the blog is reachable from the top navigation of any page', () => {
  const html = renderBlogIndex('abc123');
  assert.match(html, new RegExp(`href="\\.\\./${BLOG_INDEX.slug}/"`));
});

// Ссылка — дело публикатора. Вписанная в текст руками, она уедет в пост дважды
// и съест лимит подписи, до которого у длинных записей и так недалеко.
test('в текстах для Telegram нет ссылок — их ставит публикатор', () => {
  const withLinks = POSTS.filter(p => /https?:\/\//.test(p.tg)).map(p => p.slug);
  assert.deepEqual(withLinks, []);
});
