import { mkdir, writeFile, copyFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fetchAllClockProducts } from './wbCatalog.js';
import { renderIndexPage, renderProductPage } from './render.js';
import { renderSitemap, renderRobotsTxt } from './sitemap.js';

// Короткий отпечаток стилей и скриптов — попадает в адрес файла (?v=…), чтобы
// после правки вёрстки браузер скачал новую версию, а не показывал старую из кэша.
async function assetVersion(sources) {
  const hash = createHash('md5');
  for (const source of sources) hash.update(await readFile(source));
  return hash.digest('hex').slice(0, 8);
}

export async function buildSite({ wbToken, baseUrl, outDir, fetchFn = fetch }) {
  const products = await fetchAllClockProducts(wbToken, { fetchFn });

  // Пустой каталог = сломанный API, а не «товары кончились». Лучше упасть и
  // оставить опубликованной предыдущую версию сайта, чем выложить пустую витрину.
  if (products.length === 0) {
    throw new Error('WB вернул пустой каталог — сборка отменена');
  }

  const assetSources = [
    new URL('./links.js', import.meta.url),
    ...['style.css', 'search.js', 'order-form.js'].map(a => new URL(`../static/${a}`, import.meta.url)),
  ];
  const version = await assetVersion(assetSources);

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'index.html'), renderIndexPage(products, version));
  await writeFile(path.join(outDir, 'sitemap.xml'), renderSitemap(products, baseUrl));
  await writeFile(path.join(outDir, 'robots.txt'), renderRobotsTxt(baseUrl));

  for (const product of products) {
    const productDir = path.join(outDir, 'tovar', String(product.nmId));
    await mkdir(productDir, { recursive: true });
    await writeFile(path.join(productDir, 'index.html'), renderProductPage(product, version));
  }

  for (const source of assetSources) {
    await copyFile(source, path.join(outDir, path.basename(source.pathname)));
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
