import {
  ORIGINAL_PRICE, SALE_PRICE, SHIPPING_TEXT,
  buildTelLink, buildWhatsAppLink, buildTelegramLink, buildWbLink,
  buildCardWhatsAppMessage, truncate,
} from './links.js';

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderPriceBlock() {
  return `<div class="price">
      <span class="price-old">${ORIGINAL_PRICE} ₽</span>
      <span class="price-new">${SALE_PRICE} ₽</span>
      <div class="shipping">${SHIPPING_TEXT}</div>
    </div>`;
}

function renderOrderButtons(product) {
  const waMsg = buildCardWhatsAppMessage(product.name, product.nmId);
  return `<div class="order-buttons">
      <a href="${buildTelLink()}">Позвонить</a>
      <a href="${escapeHtml(buildWhatsAppLink(waMsg))}" target="_blank" rel="noopener">WhatsApp</a>
      <a href="${buildTelegramLink()}" target="_blank" rel="noopener">Telegram</a>
      <a href="${buildWbLink(product.nmId)}" target="_blank" rel="noopener">Купить на WB</a>
    </div>`;
}

function renderCard(product) {
  const safeName = escapeHtml(product.name);
  const href = `tovar/${product.nmId}/`;
  return `<article class="card" data-name="${escapeHtml(product.name.toLowerCase())}">
    <a href="${href}"><img src="${escapeHtml(product.photo)}" loading="lazy" alt="${safeName}"></a>
    <h3><a href="${href}">${safeName}</a></h3>
    <p>${escapeHtml(truncate(product.description, 150))}</p>
    ${renderPriceBlock()}
    ${renderOrderButtons(product)}
  </article>`;
}

// prefix — путь до корня сайта: '' для главной, '../../' для страницы товара.
// Абсолютные пути нельзя: сайт живёт в подпапке GitHub Pages.
function pageShell({ title, description, body, prefix = '', scripts = [] }) {
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="stylesheet" href="${prefix}style.css">
</head>
<body>
${body}
${scripts.map(s => `<script type="module" src="${prefix}${s}"></script>`).join('\n')}
</body>
</html>
`;
}

export function renderIndexPage(products) {
  const body = `<h1>Настенные часы — каталог</h1>
<input id="search" type="search" placeholder="Поиск по названию...">
<div class="grid">
${products.map(renderCard).join('\n')}
</div>`;
  return pageShell({
    title: 'Настенные часы — каталог, бесплатная доставка по России',
    description: `${products.length} моделей настенных часов. Цена ${SALE_PRICE} ₽, доставка по всей России бесплатная.`,
    body,
    scripts: ['search.js'],
  });
}

export function renderProductPage(product) {
  const safeName = escapeHtml(product.name);
  const body = `<a href="../../">← Ко всем часам</a>
<article class="product">
  <img src="${escapeHtml(product.photo)}" alt="${safeName}">
  <h1>${safeName}</h1>
  <p>${escapeHtml(product.description)}</p>
  ${renderPriceBlock()}
  ${renderOrderButtons(product)}
  <form id="order-form" data-name="${safeName}" data-nmid="${product.nmId}">
    <label>ФИО <input id="fio" required></label>
    <label>Телефон <input id="phone" type="tel" required></label>
    <label>Город и адрес доставки <input id="address" required></label>
    <button type="submit" data-target="whatsapp">Отправить в WhatsApp</button>
    <button type="submit" data-target="telegram">Отправить в Telegram</button>
  </form>
</article>`;
  return pageShell({
    title: product.name,
    description: truncate(product.description, 150),
    body,
    prefix: '../../',
    scripts: ['order-form.js'],
  });
}
