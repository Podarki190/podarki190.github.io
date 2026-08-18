import {
  PHONE, PHONES, TELEGRAM, ORIGINAL_PRICE, SALE_PRICE, LAYERED_PRICE, SHIPPING_TEXT, ORDER_ENDPOINT,
  VK_LINK, METRIKA_ID, YANDEX_VERIFICATION, GOOGLE_VERIFICATION,
  formatPhone, buildTelLink, buildWhatsAppLink, buildTelegramLink, buildMaxLink, buildWbLink,
  buildCardWhatsAppMessage, truncate,
} from './links.js';
import { PAGES } from './pages.js';
import { SERVICES, SERVICES_INDEX } from './services.js';
import { ALL_THEMES, themesOf, isLayered } from './themes.js';

// Имя мастерской совпадает с доменом lazerklin.ru, карточкой на Яндекс Картах
// и группой ВК: поисковику проще связать их в один бизнес, когда везде одно имя.
const SITE_NAME = 'Лазер Клин';
const SITE_TAGLINE = 'мастерская лазерной резки и гравировки';

function renderNav(prefix, current) {
  const item = (href, label, active) =>
    `<a href="${href}"${active ? ' aria-current="page"' : ''}>${label}</a>`;
  return [
    item(`${prefix}`, 'Каталог', current === 'index'),
    item(`${prefix}${SERVICES_INDEX.slug}/`, SERVICES_INDEX.nav, current === SERVICES_INDEX.slug),
    ...PAGES.map(p => item(`${prefix}${p.slug}/`, p.nav, current === p.slug)),
  ].join('\n      ');
}

// Оба номера кликабельны: на телефоне это звонок в одно касание, на
// компьютере — понятная подпись, которую можно переписать.
function renderPhones() {
  return PHONES
    .map(phone => `    <a class="phone" href="${buildTelLink(phone)}">${formatPhone(phone)}</a>`)
    .join('\n');
}

function renderHeader(prefix, current) {
  return `<header class="site-header">
  <a class="brand" href="${prefix}">
    <span class="brand-name">${SITE_NAME}</span>
    <span class="brand-tagline">${SITE_TAGLINE}</span>
  </a>
  <nav class="site-nav">
      ${renderNav(prefix, current)}
  </nav>
  <div class="site-phones">
${renderPhones()}
  </div>
</header>`;
}

function renderFooter(prefix, current) {
  return `<footer class="site-footer">
  <nav class="site-nav">
      ${renderNav(prefix, current)}
  </nav>
  <p class="footer-contacts">
${renderPhones()}
    <a href="${buildMaxLink()}" target="_blank" rel="noopener">Макс</a>
    <a href="${VK_LINK}" target="_blank" rel="noopener">ВКонтакте</a>
    <a href="${buildTelegramLink()}" target="_blank" rel="noopener">Telegram @${TELEGRAM}</a>
  </p>
  <p class="footer-note">${SITE_NAME} — ${SITE_TAGLINE} в городе Клин.
    Уникальные настенные часы ручной работы мастеров из города Клин. ${SHIPPING_TEXT}.</p>
</footer>`;
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderPriceBlock(product) {
  return `<div class="price">
      <span class="price-old">${ORIGINAL_PRICE} ₽</span>
      <span class="price-new">${isLayered(product) ? LAYERED_PRICE : SALE_PRICE} ₽</span>
      <div class="shipping">${SHIPPING_TEXT}</div>
    </div>`;
}

function renderOrderButtons(product) {
  const waMsg = buildCardWhatsAppMessage(product.name, product.nmId);
  return `<div class="order-buttons">
      <a class="btn btn-call" href="${buildTelLink()}">Позвонить</a>
      <a class="btn btn-wa" href="${escapeHtml(buildWhatsAppLink(waMsg))}" target="_blank" rel="noopener">Написать в WhatsApp</a>
      <a class="btn btn-max" href="${buildMaxLink()}" target="_blank" rel="noopener">Написать в Макс</a>
      <a class="btn btn-tg" href="${buildTelegramLink()}" target="_blank" rel="noopener">Telegram</a>
      <a class="btn btn-wb" href="${buildWbLink(product.nmId)}" target="_blank" rel="noopener">Купить на WB</a>
    </div>`;
}

// Кнопок заказа на плитке нет намеренно: они есть на странице товара, а на
// витрине их 5359 копий (одни ссылки WhatsApp с закодированным русским текстом
// весили 2,2 МБ). Плитка ведёт на страницу товара, там и заказывают.
function renderCard(product, hrefPrefix = 'tovar/') {
  const safeName = escapeHtml(product.name);
  const href = `${hrefPrefix}${product.slug ?? product.nmId}/`;
  return `<article class="card" data-slug="${product.slug ?? product.nmId}" data-name="${escapeHtml(product.name.toLowerCase())}" data-themes="${themesOf(product).join(' ')}">
    <a href="${href}"><img src="${escapeHtml(product.photo)}" loading="lazy" alt="${safeName}"></a>
    <h3><a href="${href}">${safeName}</a></h3>
    <p>${escapeHtml(truncate(product.description, 150))}</p>
    ${renderPriceBlock(product)}
  </article>`;
}

// prefix — путь до корня сайта: '' для главной, '../../' для страницы товара.
// Абсолютные пути нельзя: сайт живёт в подпапке GitHub Pages.
// version — отпечаток содержимого стилей и скриптов. Без него браузер месяцами
// держит старый style.css из кэша, и правки вёрстки не доезжают до людей.
function pageShell({ title, description, body, prefix = '', scripts = [], version = '', current = '' }) {
  const v = version ? `?v=${version}` : '';
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="icon" href="${prefix}favicon.png${v}">${
  YANDEX_VERIFICATION ? `\n<meta name="yandex-verification" content="${YANDEX_VERIFICATION}">` : ''}${
  GOOGLE_VERIFICATION ? `\n<meta name="google-site-verification" content="${GOOGLE_VERIFICATION}">` : ''}
<link rel="stylesheet" href="${prefix}style.css${v}">
</head>
<body>
${renderHeader(prefix, current)}
<main>
${body}
</main>
${renderFooter(prefix, current)}
${scripts.map(s => `<script type="module" src="${prefix}${s}${v}"></script>`).join('\n')}${METRIKA_ID ? `
<script>
(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,
a.parentNode.insertBefore(k,a)})(window,document,'script','https://mc.yandex.ru/metrika/tag.js','ym');
ym(${METRIKA_ID},'init',{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});
</script>
<noscript><div><img src="https://mc.yandex.ru/watch/${METRIKA_ID}" style="position:absolute;left:-9999px" alt=""></div></noscript>` : ''}
</body>
</html>
`;
}

// Сколько карточек показываем на главной. Полный список в 5300 товаров давал
// страницу на 4,9 МБ: Яндекс.Вебмастер не смог её прочитать и объявил сайт
// недоступным, а робот при обходе спотыкался бы так же. Каждый товар всё равно
// попадает в индекс — через карту сайта и страницу своей темы.
const HOME_LIMIT = 300;

export function renderIndexPage(allProducts, version = '', theme = null) {
  const products = theme ? allProducts : allProducts.slice(0, HOME_LIMIT);
  const hidden = allProducts.length - products.length;
  // Чипсы — обычные ссылки, а не кнопки: у каждой темы свой адрес, поэтому
  // поисковик её видит и индексирует. Через решётку (#t=...) тема оставалась
  // невидимой — для поисковика это всё та же главная страница.
  const prefix = theme ? '../../' : '';
  const present = new Set(allProducts.flatMap(p => themesOf(p)));
  const chips = [{ id: '', label: 'Все часы' }, ...ALL_THEMES]
    .filter(item => !item.id || present.has(item.id) || (theme && item.id === theme.id))
    .map(item => {
      const active = theme ? item.id === theme.id : !item.id;
      const href = item.id ? `${prefix}tema/${item.id}/` : prefix || './';
      return `<a class="chip" href="${href}"${active ? ' aria-current="page"' : ''}>${item.label}</a>`;
    })
    .join('\n    ');

  // У темы может быть свой заголовок под живой поисковый запрос
  // («Настенные часы в подарок учителю»), иначе собираем из названия темы.
  const heading = theme
    ? theme.heading || `${theme.label} — настенные часы`
    : 'Уникальные настенные часы — ручная работа мастеров из города Клин';

  const body = `<h1>${escapeHtml(heading)}</h1>
<input id="search" type="search" placeholder="Поиск по названию...">
<div class="chips" id="chips">
    ${chips}
</div>
<p id="search-count"></p>
${hidden > 0 ? `<p class="home-note">Показаны ${products.length} новых моделей из ${allProducts.length}.
  Остальные — по темам выше: там собран весь каталог.</p>` : ''}
<div class="grid">
${products.map(p => renderCard(p, `${prefix}tovar/`)).join('\n')}
</div>
<section id="global-results" class="global-results" hidden></section>`;

  return pageShell({
    title: theme
      ? theme.title || `${theme.label}: настенные часы ручной работы, ${products.length} моделей`
      : 'Уникальные настенные часы — ручная работа мастеров из города Клин',
    description: theme
      ? `${theme.heading || theme.label} — ${products.length} моделей ручной работы из Клина. Цена от ${SALE_PRICE} ₽, доставка по всей России бесплатная.`
      : `${allProducts.length} моделей настенных часов ручной работы из Клина. Цена от ${SALE_PRICE} ₽, доставка по всей России бесплатная.`,
    body,
    prefix,
    scripts: ['search.js'],
    version,
    current: theme ? '' : 'index',
  });
}

export function renderStaticPage(page, version = '', prefix = '../') {
  return pageShell({
    title: page.title,
    description: page.description,
    body: `<article class="page">
  <h1>${escapeHtml(page.title)}</h1>
${page.body}
</article>`,
    prefix,
    version,
    current: page.slug,
  });
}

// Витрина услуг: плитки с фотографией и одной строкой о сути. Каждая ведёт на
// свою страницу — именно они и попадают в поисковую выдачу.
const servicePhotoSrc = (service, prefix) =>
  service.photo.startsWith('http') ? service.photo : `${prefix}uslugi/${service.photo}`;

export function renderServicesIndex(version = '') {
  const cards = SERVICES.map(service => `<a class="service-card" href="${service.slug}/">
    ${service.photo
      ? `<img class="${service.photo.startsWith('http') ? 'tall' : ''}" src="${servicePhotoSrc(service, '../')}" loading="lazy" alt="${escapeHtml(service.nav)}">`
      : '<div class="service-noimg" aria-hidden="true"></div>'}
    <h2>${escapeHtml(service.nav)}</h2>
    <p>${escapeHtml(service.short)}</p>
  </a>`).join('\n  ');

  return pageShell({
    title: SERVICES_INDEX.title,
    description: SERVICES_INDEX.description,
    body: `<article class="page services-page">
  <h1>Лазерная резка и гравировка в Клину</h1>
  <img class="services-hero" src="../uslugi/masterskaya.jpg"
    alt="Мастерская «Лазер Клин» в Клину: лазерные станки и готовые изделия из дерева">
  <p class="services-lead">Мастерская «Лазер Клин» на Литейной, 20: режем и гравируем по вашим макетам, изготавливаем печати, награды, упаковку и декор. Всё делается под заказ, поэтому стоимость считается по макету, материалу и тиражу — расскажите задачу, и мы посчитаем.</p>
  <div class="services-grid">
  ${cards}
  </div>
</article>`,
    prefix: '../',
    version,
    current: SERVICES_INDEX.slug,
  });
}

// Заявка на услугу. Механика та же, что у заказа часов (order-form.js), и поля
// те же — иначе пришлось бы переписывать скрипт приёма на стороне Google.
// Отличается только смысл: человек не оформляет покупку, а просит расчёт.
function renderRequestForm(subject) {
  const safe = escapeHtml(subject);
  return `<section class="request">
    <h2>Есть вопрос или нужен расчёт?</h2>
    <p>Напишите, что нужно сделать, — мы свяжемся с вами, ответим подробно и посчитаем стоимость.</p>
    <div class="order-buttons">
      ${PHONES.map(phone => `<a class="btn btn-call" href="${buildTelLink(phone)}">Позвонить ${formatPhone(phone)}</a>`).join('\n      ')}
    </div>
    <form id="order-form" data-kind="callback" data-name="${safe}" data-nmid="">
      <label>Имя <input id="fio" required></label>
      <label>Телефон <input id="phone" type="tel" required></label>
      <label>Что нужно сделать <input id="address" required placeholder="материал, размер, тираж, срок"></label>
      ${ORDER_ENDPOINT ? `<button class="btn btn-order" type="button" id="order-send">Отправить заявку</button>
      <p class="order-alt">или напишите нам сами:</p>` : ''}
      <button class="btn btn-wa" type="submit" data-target="whatsapp">Написать в WhatsApp</button>
      <button class="btn btn-tg" type="submit" data-target="telegram">Написать в Telegram</button>
    </form>
    <section id="order-done" class="order-done" hidden></section>
  </section>`;
}

export function renderServicePage(service, version = '') {
  return pageShell({
    title: service.title,
    description: service.description,
    body: `<article class="page">
  <h1>${escapeHtml(service.title)}</h1>
  ${service.photo ? `<img class="service-photo${service.photo.startsWith('http') ? ' tall' : ''}" src="${servicePhotoSrc(service, '../../')}" alt="${escapeHtml(service.nav)} — мастерская «Лазер Клин» в Клину" loading="lazy">` : ''}
${service.body}
  ${renderRequestForm(service.nav)}
  <p class="service-back"><a href="../">← Все услуги мастерской</a></p>
</article>`,
    prefix: '../../',
    scripts: ['order-form.js'],
    version,
    current: SERVICES_INDEX.slug,
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
<article class="product">
  ${renderGallery(product)}
  <div class="product-info">
    <h1>${safeName}</h1>
    ${renderPriceBlock(product)}
    ${renderOrderButtons(product)}
    <form id="order-form" data-name="${safeName}" data-nmid="${product.nmId}">
      <h2>Оформить заказ</h2>
      <label>ФИО <input id="fio" required></label>
      <label>Телефон <input id="phone" type="tel" required></label>
      <label>Город и адрес доставки <input id="address" required></label>
      ${ORDER_ENDPOINT ? `<button class="btn btn-order" type="button" id="order-send">Оформить заказ</button>
      <p class="order-alt">или напишите нам сами:</p>` : ''}
      <button class="btn btn-wa" type="submit" data-target="whatsapp">Отправить в WhatsApp</button>
      <button class="btn btn-tg" type="submit" data-target="telegram">Отправить в Telegram</button>
    </form>
    <section id="order-done" class="order-done" hidden></section>
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
