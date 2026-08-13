import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fetchAllClockProducts } from './wbCatalog.js';
import { renderIndexPage, renderProductPage } from './render.js';
import { renderSitemap, renderRobotsTxt } from './sitemap.js';

export async function buildSite({ wbToken, baseUrl, outDir, fetchFn = fetch }) {
  const products = await fetchAllClockProducts(wbToken, { fetchFn });

  // Пустой каталог = сломанный API, а не «товары кончились». Лучше упасть и
  // оставить опубликованной предыдущую версию сайта, чем выложить пустую витрину.
  if (products.length === 0) {
    throw new Error('WB вернул пустой каталог — сборка отменена');
  }

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'index.html'), renderIndexPage(products));
  await writeFile(path.join(outDir, 'sitemap.xml'), renderSitemap(products, baseUrl));
  await writeFile(path.join(outDir, 'robots.txt'), renderRobotsTxt(baseUrl));

  for (const product of products) {
    const productDir = path.join(outDir, 'tovar', String(product.nmId));
    await mkdir(productDir, { recursive: true });
    await writeFile(path.join(productDir, 'index.html'), renderProductPage(product));
  }

  await copyFile(new URL('./links.js', import.meta.url), path.join(outDir, 'links.js'));
  for (const asset of ['style.css', 'search.js', 'order-form.js']) {
    await copyFile(new URL(`../static/${asset}`, import.meta.url), path.join(outDir, asset));
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

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
