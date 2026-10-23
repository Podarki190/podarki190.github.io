// Фид для Яндекс Товаров (формат YML). Его один раз добавляют в Вебмастере
// («Товары и цены» → «Фиды»), дальше Яндекс сам перечитывает его после каждой
// сборки и показывает наши часы во вкладке «Товары» со ссылкой на сайт.
import { priceOf } from './render.js';
import { isMug } from './wbCatalog.js';

const xml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export function renderYml(products, baseUrl, now = new Date()) {
  const base = baseUrl.replace(/\/+$/, '');
  const offers = products.map(p => {
    const { price, old } = priceOf(p);
    const pictures = (p.photos?.length ? p.photos : [p.photo]).slice(0, 10);
    return `      <offer id="${p.nmId}" available="true">
        <name>${xml(p.name)}</name>
        <url>${base}/tovar/${p.slug}/</url>
        <price>${price}</price>
        <oldprice>${old}</oldprice>
        <currencyId>RUB</currencyId>
        <categoryId>${isMug(p) ? 2 : 1}</categoryId>
${pictures.map(src => `        <picture>${xml(src)}</picture>`).join('\n')}
        <delivery>true</delivery>
        <vendor>Лазер Клин</vendor>
        <description>${xml((p.description ?? "").slice(0, 3000))}</description>
      </offer>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<yml_catalog date="${now.toISOString().slice(0, 16)}">
  <shop>
    <name>Лазер Клин</name>
    <company>Лазер Клин, мастерская лазерной резки и гравировки</company>
    <url>${base}/</url>
    <currencies><currency id="RUB" rate="1"/></currencies>
    <categories>
      <category id="1">Настенные часы</category>
      <category id="2">Кружки</category>
    </categories>
    <offers>
${offers}
    </offers>
  </shop>
</yml_catalog>
`;
}
