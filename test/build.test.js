import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildSite } from '../src/build.js';
import { PAGES } from '../src/pages.js';
import { publishedPosts } from '../src/blog.js';

test('buildSite writes index, one page per product with a photo, sitemap and robots.txt', async () => {
  const outDir = await mkdtemp(path.join(tmpdir(), 'catalog-build-'));

  const fetchFn = async (url) => {
    if (url.includes('content-api.wildberries.ru')) {
      return new Response(JSON.stringify({
        cards: [
          { nmID: 1, title: 'Часы А', description: 'Описание А', createdAt: '2024-09-28T00:00:00Z',
            updatedAt: '2024-09-28T00:00:00Z',
            photos: [{ big: 'https://basket-46.wbbasket.ru/1/images/big/1.webp' }] },
          { nmID: 2, title: 'Часы Б', description: 'Описание Б', createdAt: '2026-07-01T00:00:00Z',
            updatedAt: '2026-07-01T00:00:00Z', photos: [] }, // без фото -> не в каталоге
          { nmID: 3, title: 'Часы В', description: 'Описание В', createdAt: '2026-08-07T00:00:00Z',
            updatedAt: '2026-08-07T00:00:00Z',
            photos: [{ big: 'https://basket-46.wbbasket.ru/3/images/big/1.webp' }] },
        ],
      }), { status: 200 });
    }
    throw new Error(`unexpected fetch: ${url}`);
  };

  const count = await buildSite({
    wbToken: 't',
    baseUrl: 'https://example.github.io/catalog',
    outDir,
    fetchFn,
  });

  assert.equal(count, 2);

  const index = await readFile(path.join(outDir, 'index.html'), 'utf8');
  assert.match(index, /Часы А/);
  assert.match(index, /Часы В/);
  assert.doesNotMatch(index, /Часы Б/);
  assert.ok(index.indexOf('Часы В') < index.indexOf('Часы А'), 'новые товары должны быть выше');

  // адрес страницы — из названия латиницей, а не из номера WB
  const productPage = await readFile(path.join(outDir, 'tovar', 'chasy-a', 'index.html'), 'utf8');
  assert.match(productPage, /Часы А/);
  await assert.rejects(() => readFile(path.join(outDir, 'tovar', 'chasy-b', 'index.html')));

  const sitemap = await readFile(path.join(outDir, 'sitemap.xml'), 'utf8');
  assert.match(sitemap, /tovar\/chasy-a\//);
  assert.match(sitemap, /tovar\/chasy-v\//);

  assert.match(await readFile(path.join(outDir, 'robots.txt'), 'utf8'), /Sitemap:/);

  // текстовые страницы и их адреса в карте сайта
  for (const page of PAGES) {
    const html = await readFile(path.join(outDir, page.slug, 'index.html'), 'utf8');
    assert.match(html, new RegExp(page.title.split(' ')[0]));
    assert.ok(sitemap.includes(`/${page.slug}/`), `${page.slug} нет в sitemap`);
  }

  // отпечаток стилей должен быть один и тот же на всех страницах
  const stamp = index.match(/style\.css\?v=([a-f0-9]{8})/);
  assert.ok(stamp, 'на главной нет версии стилей');
  assert.ok(productPage.includes(`style.css?v=${stamp[1]}`));

  // блог: витрина, страница записи, её фотографии рядом с ней и адреса в карте
  const blogIndex = await readFile(path.join(outDir, 'blog', 'index.html'), 'utf8');
  assert.match(blogIndex, /Блог мастерской/);
  assert.ok(sitemap.includes('/blog/'), 'блога нет в sitemap');
  for (const post of publishedPosts()) {
    const dir = path.join(outDir, 'blog', post.slug);
    assert.match(await readFile(path.join(dir, 'index.html'), 'utf8'), /<h1>/);
    // Картинка должна лежать именно рядом со страницей: адрес в HTML — «1.jpg».
    for (let i = 1; i <= post.alts.length; i += 1) await readFile(path.join(dir, `${i}.jpg`));
    assert.ok(sitemap.includes(`/blog/${post.slug}/`), `${post.slug} нет в sitemap`);
  }

  // копии для браузера
  await readFile(path.join(outDir, 'links.js'), 'utf8');
  await readFile(path.join(outDir, 'style.css'), 'utf8');
  await readFile(path.join(outDir, 'search.js'), 'utf8');
  await readFile(path.join(outDir, 'order-form.js'), 'utf8');

  await rm(outDir, { recursive: true, force: true });
});

test('buildSite refuses to build an empty catalog instead of publishing a blank site', async () => {
  const outDir = await mkdtemp(path.join(tmpdir(), 'catalog-empty-'));
  const fetchFn = async () => new Response(JSON.stringify({ cards: [] }), { status: 200 });

  await assert.rejects(
    () => buildSite({ wbToken: 't', baseUrl: 'https://example.github.io/catalog', outDir, fetchFn }),
    /пуст/
  );

  await rm(outDir, { recursive: true, force: true });
});
