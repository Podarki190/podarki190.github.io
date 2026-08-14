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
function renderCard(product, hrefPrefix = 'tovar/') {
  const safeName = escapeHtml(product.name);
  const href = `${hrefPrefix}${product.nmId}/`;
  return `<article class="card" data-name="${escapeHtml(product.name.toLowerCase())}">
    <a href="${href}"><img src="${escapeHtml(product.photo)}" loading="lazy" alt="${safeName}"></a>
    <h3><a href="${href}">${safeName}</a></h3>
    <p>${escapeHtml(truncate(product.description, 150))}</p>
    ${renderPriceBlock()}
  </article>`;
}

// prefix — путь до корня сайта: '' для главной, '../../' для страницы товара.
// Абсолютные пути нельзя: сайт живёт в подпапке GitHub Pages.
// version — отпечаток содержимого стилей и скриптов. Без него браузер месяцами
// держит старый style.css из кэша, и правки вёрстки не доезжают до людей.
function pageShell({ title, description, body, prefix = '', scripts = [], version = '' }) {
  const v = version ? `?v=${version}` : '';
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='26' font-size='26'>🕰️</text></svg>">
<link rel="stylesheet" href="${prefix}style.css${v}">
</head>
<body>
${body}
${scripts.map(s => `<script type="module" src="${prefix}${s}${v}"></script>`).join('\n')}
</body>
</html>
`;
}

export function renderIndexPage(products, version = '') {
  const body = `<h1>Уникальные настенные часы — ручная работа мастеров из города Клин</h1>
<input id="search" type="search" placeholder="Поиск по названию...">
<p id="search-count"></p>
<div class="grid">
${products.map(p => renderCard(p)).join('\n')}
</div>`;
  return pageShell({
    title: 'Уникальные настенные часы — ручная работа мастеров из города Клин',
    description: `${products.length} моделей настенных часов ручной работы из Клина. Цена ${SALE_PRICE} ₽, доставка по всей России бесплатная.`,
    body,
    scripts: ['search.js'],
    version,
  });
}

// Галерея — обычная лента с CSS scroll-snap: на телефоне листается пальцем,
// на компьютере прокручивается колесом. Ни строчки JS.
function renderGallery(product) {
  const photos = product.photos?.length ? product.photos : [product.photo];
  const safeName = escapeHtml(product.name);
  const slides = photos.map((src, i) => `
      <img src="${escapeHtml(src)}" alt="${safeName} — фото ${i + 1}"${i ? ' loading="lazy"' : ''}>`).join('');
  return `<div class="gallery-wrap">
    <div class="gallery">${slides}
    </div>
    ${photos.length > 1 ? `<p class="gallery-hint">${photos.length} фото — пролистайте галерею</p>` : ''}
  </div>`;
}

// Соседи известны уже на сборке: каталог отсортирован, сосед — просто следующий
// элемент массива. Если человек пришёл из поиска, product-nav.js переставит
// ссылки на соседей по его подборке.
function renderProductNav({ prev, next }) {
  // Всегда <a>: если соседа нет, ссылка просто без href и погашена. Так
  // product-nav.js может оживить её, когда посетитель пришёл из поиска.
  const arrow = (product, cls, sign, label) => `
  <a class="pnav ${cls}${product ? '' : ' pnav-off'}" id="pnav-${cls}" rel="${cls}"${
    product ? ` href="../${product.nmId}/" title="${escapeHtml(product.name)}"` : ''}>
    <span class="pnav-sign">${sign}</span>
    <span class="pnav-label">${label}</span>
  </a>`;
  return `${arrow(prev, 'prev', '‹', 'Предыдущие')}${arrow(next, 'next', '›', 'Следующие')}
  <p id="pnav-context"></p>`;
}

// Ряд похожих товаров внизу карточки — так делают все живые магазины: человек
// видит, куда идёт, а не жмёт стрелку вслепую. Соседи по каталогу почти всегда
// из той же партии, то есть одной темы.
function renderSimilar(similar) {
  if (!similar?.length) return '';
  return `<section class="similar">
  <h2>Похожие товары</h2>
  <div class="grid">
${similar.map(p => renderCard(p, '../')).join('\n')}
  </div>
</section>`;
}

export function renderProductPage(product, version = '', neighbours = {}) {
  const safeName = escapeHtml(product.name);
  const body = `<a href="../../" id="back-link">← Ко всем часам</a>
${renderProductNav(neighbours)}
<article class="product">
  ${renderGallery(product)}
  <div class="product-info">
    <h1>${safeName}</h1>
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
    <p class="description">${escapeHtml(product.description)}</p>
  </div>
</article>
${renderSimilar(neighbours.similar)}`;
  return pageShell({
    title: product.name,
    description: truncate(product.description, 150),
    body,
    prefix: '../../',
    scripts: ['order-form.js', 'product-nav.js'],
    version,
  });
}
