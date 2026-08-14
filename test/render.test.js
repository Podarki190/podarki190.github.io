import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderIndexPage, renderProductPage, escapeHtml } from '../src/render.js';

const product = {
  nmId: 1259100136,
  name: 'Часы настенные "Локомотив Ярославль"',
  description: 'А'.repeat(200),
  photo: 'https://basket-46.wbbasket.ru/x/images/big/1.webp',
  photos: [
    'https://basket-46.wbbasket.ru/x/images/big/1.webp',
    'https://basket-46.wbbasket.ru/x/images/big/2.webp',
    'https://basket-46.wbbasket.ru/x/images/big/3.webp',
  ],
  createdAt: '2026-07-01T00:00:00Z',
};

test('renderProductPage shows every photo, the index tile only the first', () => {
  const page = renderProductPage(product);
  for (const src of product.photos) assert.ok(page.includes(src), `нет фото ${src}`);
  assert.match(page, /3 фото/);

  const index = renderIndexPage([product]);
  assert.ok(index.includes(product.photos[0]));
  assert.ok(!index.includes(product.photos[1]), 'на плитке должно быть одно фото');
});

test('renderProductPage falls back to the single photo when photos is missing', () => {
  const { photos, ...withoutGallery } = product;
  const page = renderProductPage(withoutGallery);
  assert.ok(page.includes(product.photo));
  assert.doesNotMatch(page, /фото — листайте/);
});

test('order buttons are colour-coded by channel', () => {
  const page = renderProductPage(product);
  for (const cls of ['btn-call', 'btn-wa', 'btn-tg', 'btn-wb']) assert.match(page, new RegExp(cls));
});

test('escapeHtml escapes quotes and angle brackets', () => {
  assert.equal(escapeHtml(`<b>"Тест" & Co</b>`), '&lt;b&gt;&quot;Тест&quot; &amp; Co&lt;/b&gt;');
});

test('renderIndexPage embeds every product as real HTML text (no JS-only rendering)', () => {
  const html = renderIndexPage([product]);
  assert.match(html, /Локомотив Ярославль/);
  assert.match(html, /1890/);
  assert.match(html, /7000/);
  assert.match(html, /Доставка по всей России Бесплатная/);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /href="tovar\/1259100136\/"/);
  assert.match(html, /search\.js/);
});

// 5359 плиток × четыре ссылки = мегабайты, а заказывают всё равно со страницы товара.
test('index tiles carry no order buttons, the product page does', () => {
  assert.doesNotMatch(renderIndexPage([product]), /wa\.me|tel:|t\.me/);
  assert.match(renderProductPage(product), /wa\.me/);
});

test('renderIndexPage keeps the order it was given (newest first comes from the fetcher)', () => {
  const older = { ...product, nmId: 1, name: 'Старые часы' };
  const html = renderIndexPage([product, older]);
  assert.ok(html.indexOf('Локомотив Ярославль') < html.indexOf('Старые часы'));
});

test('renderProductPage sets a per-product title and meta description', () => {
  const html = renderProductPage(product);
  assert.match(html, /<title>Часы настенные &quot;Локомотив Ярославль&quot;/);
  assert.match(html, /<meta name="description" content="[^"]{20,160}"/);
  assert.match(html, /id="order-form"/);
  assert.match(html, /data-nmid="1259100136"/);
  assert.match(html, /order-form\.js/);
});

test('renderProductPage shows the full description, not truncated', () => {
  const html = renderProductPage(product);
  assert.ok(html.includes('А'.repeat(200)));
});

test('renderProductPage links back to the catalog and to WB', () => {
  const html = renderProductPage(product);
  assert.match(html, /href="\.\.\/\.\.\/"/);
  assert.match(html, /https:\/\/www\.wildberries\.ru\/catalog\/1259100136\/detail\.aspx/);
  assert.match(html, /wa\.me\/79266642121/);
  assert.match(html, /t\.me\/Podarki190/);
  assert.match(html, /tel:\+79266642121/);
});

// Сайт живёт в подпапке (https://user.github.io/wall-clocks-catalog/), поэтому
// абсолютный путь вида /style.css уехал бы в корень домена и отдал 404.
// Без отпечатка в адресе браузер держит старый style.css и правки вёрстки не доезжают.
test('asset urls carry the version stamp when one is given', () => {
  assert.match(renderIndexPage([product], 'a1b2c3d4'), /href="style\.css\?v=a1b2c3d4"/);
  assert.match(renderIndexPage([product], 'a1b2c3d4'), /src="search\.js\?v=a1b2c3d4"/);
  assert.match(renderProductPage(product, 'a1b2c3d4'), /href="\.\.\/\.\.\/style\.css\?v=a1b2c3d4"/);
  assert.doesNotMatch(renderIndexPage([product]), /\?v=/);
});

test('pages never use absolute paths for their own assets', () => {
  for (const html of [renderIndexPage([product]), renderProductPage(product)]) {
    assert.doesNotMatch(html, /(href|src)="\/[^/]/);
  }
  assert.match(renderIndexPage([product]), /href="style\.css"/);
  assert.match(renderProductPage(product), /href="\.\.\/\.\.\/style\.css"/);
});
