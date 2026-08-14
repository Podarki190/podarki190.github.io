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
      <a class="btn btn-call" href="${buildTelLink()}">Позвонить</a>
      <a class="btn btn-wa" href="${escapeHtml(buildWhatsAppLink(waMsg))}" target="_blank" rel="noopener">Написать в WhatsApp</a>
      <a class="btn btn-tg" href="${buildTelegramLink()}" target="_blank" rel="noopener">Telegram</a>
      <a class="btn btn-wb" href="${buildWbLink(product.nmId)}" target="_blank" rel="noopener">Купить на WB</a>
    </div>`;
}

// Кнопок заказа на плитке нет намеренно: они есть на странице товара, а на
// витрине их 5359 копий (одни ссылки WhatsApp с закодированным русским текстом
// весили 2,2 МБ). Плитка ведёт на страницу товара, там и заказывают.
function renderCard(product) {
  const safeName = escapeHtml(product.name);
  const href = `tovar/${product.nmId}/`;
  return `<article class="card" data-name="${escapeHtml(product.name.toLowerCase())}">
    <a href="${href}"><img src="${escapeHtml(product.photo)}" loading="lazy" alt="${safeName}"></a>
    <h3><a href="${href}">${safeName}</a></h3>
    <p>${escapeHtml(truncate(product.description, 150))}</p>
    ${renderPriceBlock()}
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
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='26' font-size='26'>🕰️</text></svg>">
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
<p id="search-count"></p>
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

// Галерея — обычная лента с CSS scroll-snap: на телефоне листается пальцем,
// на компьютере прокручивается колесом. Ни строчки JS.
function renderGallery(product) {
  const photos = product.photos?.length ? product.photos : [product.photo];
  const safeName = escapeHtml(product.name);
  const slides = photos.map((src, i) => `
    <img src="${escapeHtml(src)}" alt="${safeName} — фото ${i + 1}"${i ? ' loading="lazy"' : ''}>`).join('');
  return `<div class="gallery">${slides}
  </div>
  ${photos.length > 1 ? `<p class="gallery-hint">${photos.length} фото — листайте вбок</p>` : ''}`;
}

export function renderProductPage(product) {
  const safeName = escapeHtml(product.name);
  const body = `<a href="../../">← Ко всем часам</a>
<article class="product">
  ${renderGallery(product)}
  <h1>${safeName}</h1>
  <p>${escapeHtml(product.description)}</p>
  ${renderPriceBlock()}
  ${renderOrderButtons(product)}
  <form id="order-form" data-name="${safeName}" data-nmid="${product.nmId}">
    <h2>Оформить заказ</h2>
    <label>ФИО <input id="fio" required></label>
    <label>Телефон <input id="phone" type="tel" required></label>
    <label>Город и адрес доставки <input id="address" required></label>
    <button class="btn btn-wa" type="submit" data-target="whatsapp">Отправить в WhatsApp</button>
    <button class="btn btn-tg" type="submit" data-target="telegram">Отправить в Telegram</button>
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
