import { mkdir, writeFile, copyFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fetchAllClockProducts } from './wbCatalog.js';
import { assignSlugs, } from './slug.js';
import { isBlocked } from './blocked.js';
import { isMug } from './wbCatalog.js';
import {
  renderIndexPage, renderProductPage, renderStaticPage,
  renderServicesIndex, renderServicePage, renderBlogIndex, renderBlogPost,
} from './render.js';
import { renderSitemap, renderRobotsTxt } from './sitemap.js';
import { SITE_URL } from './links.js';
import { PAGES, WORKS_PHOTOS } from './pages.js';
import { BLOG_INDEX, publishedPosts } from './blog.js';
import { SERVICES, SERVICES_INDEX } from './services.js';
import { ALL_THEMES, themesOf, isLayered } from './themes.js';

// Короткий отпечаток стилей и скриптов — попадает в адрес файла (?v=…), чтобы
// после правки вёрстки браузер скачал новую версию, а не показывал старую из кэша.
async function assetVersion(sources) {
  const hash = createHash('md5');
  for (const source of sources) hash.update(await readFile(source));
  return hash.digest('hex').slice(0, 8);
}

// Снимки записи, обложка для соцсетей и — если у записи есть ролик — его
// миниатюра. Вынесено из цикла и экспортировано ради теста: миниатюру забыли
// в первой версии, страница собиралась без ошибки, а thumbnailUrl в разметке
// отдавал 404 и поисковик молча выбрасывал весь VideoObject.
export function postAssets(post) {
  return [
    ...post.alts.map((_, i) => `${i + 1}.jpg`),
    'og.jpg',
    ...(post.video?.thumb ? [post.video.thumb] : []),
  ];
}

export async function buildSite({ wbToken, baseUrl, outDir, fetchFn = fetch }) {
  // Снятое по правам отсеиваем ДО всего остального: страниц, карты сайта и тем
  // быть не должно нигде. WB отдаёт удалённую карточку ещё до тридцати дней,
  // ждать столько со своим сайтом нельзя.
  const fetched = await fetchAllClockProducts(wbToken, { fetchFn });
  const allowed = fetched.filter(p => !isBlocked(p));
  if (allowed.length < fetched.length) {
    console.log(`снято по правам: ${fetched.length - allowed.length} товаров`);
  }
  const products = assignSlugs(allowed);

  // Пустой каталог = сломанный API, а не «товары кончились». Лучше упасть и
  // оставить опубликованной предыдущую версию сайта, чем выложить пустую витрину.
  if (products.length === 0) {
    throw new Error('WB вернул пустой каталог — сборка отменена');
  }

  const assetSources = [
    new URL('./links.js', import.meta.url),
    // Файлы подтверждения прав — Яндекс.Вебмастер и Дзен. Выдаются под конкретный
    // сайт, при смене домена оба сервиса выдают новые.
    ...['style.css', 'search.js', 'order-form.js', 'product-nav.js', 'favicon.png',
      'icons.svg', '404.html', 'yandex_647c4b8adf060779.html',
      'zen_Jszj4lUwzl1Hir3cl4Dta56w64HLNyMOMkBh8JVTv5VvXqDiXRpUmhY5E1yYFNaT.html']
      .map(a => new URL(`../static/${a}`, import.meta.url)),
    ...WORKS_PHOTOS.map(f => new URL(`../static/raboty/${encodeURIComponent(f)}`, import.meta.url)),
    ...SERVICES.filter(s => s.photo && !s.photo.startsWith('http'))
      .map(s => new URL(`../static/uslugi/${s.photo}`, import.meta.url)),
    new URL('../static/uslugi/masterskaya.jpg', import.meta.url),
    new URL('../static/uslugi/o-nas.jpg', import.meta.url),
  ];
  const version = await assetVersion(assetSources);

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'index.html'), renderIndexPage(products, version));
  await writeFile(path.join(outDir, 'robots.txt'), renderRobotsTxt(baseUrl));
  // Свой домен. При публикации через свой workflow GitHub не создаёт CNAME сам —
  // без этого файла каждая выкладка сбрасывала бы домен на *.github.io.
  await writeFile(path.join(outDir, 'CNAME'), `${new URL(SITE_URL).host}\n`);

  for (const page of PAGES) {
    const pageDir = path.join(outDir, page.slug);
    await mkdir(pageDir, { recursive: true });
    await writeFile(path.join(pageDir, 'index.html'), renderStaticPage(page, version));
  }

  // Лёгкий список всего каталога для поиска. Качается, лишь когда человек
  // начал печатать. Адрес фото не храним: он выводится из номера товара, и
  // непредсказуем в нём только номер сервера WB — его и кладём пятым полем.
  // Последнее поле — вид товара, от него зависит цена на плитке.
  await writeFile(
    path.join(outDir, 'catalog.json'),
    JSON.stringify(products.map(p => [
      p.nmId,
      p.name,
      p.slug,
      Number((p.photo.match(/basket-(\d+)/) || [])[1] || 0),
      isMug(p) ? 2 : isLayered(p) ? 1 : 0,
    ])),
  );

  // Услуги: витрина и по странице на каждую — их и индексируют поисковики.
  const servicesDir = path.join(outDir, SERVICES_INDEX.slug);
  await mkdir(servicesDir, { recursive: true });
  await writeFile(path.join(servicesDir, 'index.html'), renderServicesIndex(version));
  for (const service of SERVICES) {
    const dir = path.join(servicesDir, service.slug);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'index.html'), renderServicePage(service, version));
  }

  // Блог: витрина и страница на каждую запись. Дата берётся один раз на всю
  // сборку — иначе сборка, начатая до полуночи и закончившаяся после, положила
  // бы в витрину один набор записей, а в карту сайта другой.
  // Фотографии лежат рядом со своей страницей, в blog/<slug>/: адрес картинки
  // тогда не зависит от версии ассетов и не ломается при перевыкладке.
  const now = new Date();
  const posts = publishedPosts(now);
  const blogDir = path.join(outDir, BLOG_INDEX.slug);
  await mkdir(blogDir, { recursive: true });
  await writeFile(path.join(blogDir, 'index.html'), renderBlogIndex(version, now));
  for (const post of posts) {
    const postDir = path.join(blogDir, post.slug);
    await mkdir(postDir, { recursive: true });
    await writeFile(path.join(postDir, 'index.html'), renderBlogPost(post, version));
    for (const name of postAssets(post)) {
      await copyFile(
        new URL(`../static/blog/${post.slug}/${name}`, import.meta.url),
        path.join(postDir, name),
      );
    }
  }

  // У каждой темы свой адрес и своя страница — иначе поисковик её не увидит.
  const themePages = [];
  for (const theme of ALL_THEMES) {
    const inTheme = products.filter(p => themesOf(p).includes(theme.id));
    if (inTheme.length === 0) continue;
    const themeDir = path.join(outDir, 'tema', theme.id);
    await mkdir(themeDir, { recursive: true });
    await writeFile(path.join(themeDir, 'index.html'), renderIndexPage(inTheme, version, theme));
    themePages.push(`tema/${theme.id}`);
  }

  await writeFile(
    path.join(outDir, 'sitemap.xml'),
    renderSitemap(products, baseUrl, [
      ...PAGES.map(p => p.slug),
      SERVICES_INDEX.slug,
      ...SERVICES.map(s => `${SERVICES_INDEX.slug}/${s.slug}`),
      BLOG_INDEX.slug,
      ...posts.map(p => `${BLOG_INDEX.slug}/${p.slug}`),
      ...themePages,
    ]),
  );

  for (const [i, product] of products.entries()) {
    const productDir = path.join(outDir, 'tovar', product.slug);
    await mkdir(productDir, { recursive: true });
    await writeFile(
      path.join(productDir, 'index.html'),
      renderProductPage(product, version, {
        prev: products[i - 1],
        next: products[i + 1],
        similar: [...products.slice(Math.max(0, i - 3), i), ...products.slice(i + 1, i + 4)],
      }),
    );
  }

  await mkdir(path.join(outDir, 'uslugi'), { recursive: true });
  if (WORKS_PHOTOS.length) await mkdir(path.join(outDir, 'raboty'), { recursive: true });
  for (const source of assetSources) {
    const name = decodeURIComponent(path.basename(source.pathname));
    const subdir = ['uslugi', 'raboty'].find(d => source.pathname.includes(`/static/${d}/`));
    await copyFile(source, subdir ? path.join(outDir, subdir, name) : path.join(outDir, name));
  }

  return products.length;
}

async function main() {
  const started = Date.now();
  const count = await buildSite({
    wbToken: process.env.WB_API_TOKEN,
    baseUrl: process.env.SITE_BASE_URL,
    outDir: 'dist',
  });
  console.log(`Built ${count} products into dist/ in ${Math.round((Date.now() - started) / 1000)}s`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
