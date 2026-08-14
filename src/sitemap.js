const trimSlash = (url) => url.replace(/\/+$/, '');

export function renderSitemap(products, baseUrl, pageSlugs = []) {
  const base = trimSlash(baseUrl);
  const urls = [
    `${base}/`,
    ...pageSlugs.map(slug => `${base}/${slug}/`),
    ...products.map(p => `${base}/tovar/${p.nmId}/`),
  ];
  const entries = urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

export function renderRobotsTxt(baseUrl) {
  return `User-agent: *\nAllow: /\nSitemap: ${trimSlash(baseUrl)}/sitemap.xml\n`;
}
