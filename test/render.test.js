import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderIndexPage, renderProductPage, renderStaticPage, renderBlogPost, escapeHtml } from '../src/render.js';
import { PAGES, captionFromFile } from '../src/pages.js';
import { SERVICES, SERVICE_GROUPS } from '../src/services.js';

const product = {
  nmId: 1259100136,
  slug: 'chasy-nastennye-lokomotiv-yaroslavl',
  name: 'Часы настенные "Локомотив Ярославль"',
  description: 'А'.repeat(200),
  photo: 'https://basket-46.wbbasket.ru/x/images/big/1.webp',
  photos: [
    'https://basket-46.wbbasket.ru/x/images/big/1.webp',
    'https://basket-46.wbbasket.ru/x/images/big/2.webp',
    'https://basket-46.wbbasket.ru/x/images/big/3.webp',
  ],
  createdAt: '2026-07-01T00:00:00Z',
};

test('renderProductPage shows every photo, the index tile only the first', () => {
  const page = renderProductPage(product);
  for (const src of product.photos) assert.ok(page.includes(src), `нет фото ${src}`);
  assert.match(page, /3 фото/);

  const index = renderIndexPage([product]);
  assert.ok(index.includes(product.photos[0]));
  assert.ok(!index.includes(product.photos[1]), 'на плитке должно быть одно фото');
});

test('renderProductPage falls back to the single photo when photos is missing', () => {
  const { photos, ...withoutGallery } = product;
  const page = renderProductPage(withoutGallery);
  assert.ok(page.includes(product.photo));
  assert.doesNotMatch(page, /фото — листайте/);
});

test('similar products are shown as real tiles linking up one level', () => {
  const similar = [
    { ...product, nmId: 111, name: 'Соседние часы', slug: 'sosedi-1' },
    { ...product, nmId: 222, name: 'Другие соседние часы', slug: 'sosedi-2' },
  ];
  const page = renderProductPage(product, '', { similar });
  assert.match(page, /<h2>Похожие товары<\/h2>/);
  assert.match(page, /href="\.\.\/sosedi-1\/"/);
  assert.match(page, /Соседние часы/);
  assert.doesNotMatch(page, /href="tovar\/sosedi-1\/"/); // не корневой путь: мы уже внутри /tovar/
});

test('no similar block when there are no neighbours', () => {
  assert.doesNotMatch(renderProductPage(product), /Похожие товары/);
});

test('index tags every tile with its themes and links to theme pages', () => {
  const clock = { ...product, name: 'Часы настенные "Лучшей маме-парикмахеру"' };
  const html = renderIndexPage([clock]);
  assert.match(html, /class="chips"/);
  // тем у товара может быть несколько: сюжет и получатель
  assert.match(html, /<article class="card"[^>]*data-themes="professii parikmaher mame"/);
  // чипс — ссылка, иначе тема не попадёт в поисковую выдачу
  assert.match(html, /<a class="chip" href="tema\/professii\/"/);
});

test('chips list only themes actually present in the catalog', () => {
  const html = renderIndexPage([{ ...product, name: 'Часы настенные "Спецназ"' }]);
  assert.match(html, />Весь каталог</);
  assert.doesNotMatch(html, />Авто и мото</);
});

// Тема должна быть отдельной страницей со своим заголовком — иначе поисковик
// её не видит: всё, что после решётки, для него не существует.
test('a theme page has its own title, heading and relative links', () => {
  const theme = { id: 'rusrock', label: 'Русский рок' };
  const html = renderIndexPage([product], '', theme);
  assert.match(html, /<title>Русский рок: настенные часы[^<]*1 моделей<\/title>/);
  assert.match(html, /<h1>Русский рок — настенные часы<\/h1>/);
  assert.match(html, /href="\.\.\/\.\.\/tovar\/chasy-nastennye-lokomotiv-yaroslavl\/"/);
  assert.match(html, /<a class="chip" href="\.\.\/\.\.\/tema\/rusrock\/" aria-current="page"/);
  assert.match(html, /href="\.\.\/\.\.\/style\.css"/);
});

test('both phone numbers are clickable in the header and footer', () => {
  for (const html of [renderIndexPage([product]), renderProductPage(product), renderStaticPage(PAGES[0])]) {
    assert.match(html, /<div class="site-phones">/);
    assert.match(html, /href="tel:\+79266642121"[^>]*>8 \(926\) 664-21-21</);
    assert.match(html, /href="tel:\+79032203355"[^>]*>8 \(903\) 220-33-55</);
  }
});

// Главная на 5300 карточек весила 4,9 МБ, и Вебмастер объявлял сайт
// недоступным, не сумев её дочитать.
test('the home page shows a slice, a theme page shows everything given', () => {
  const many = Array.from({ length: 350 }, (_, i) => ({ ...product, nmId: 1000 + i }));
  const home = renderIndexPage(many);
  assert.equal((home.match(/<article class="card"/g) || []).length, 300);
  assert.match(home, /Показаны 300 новых моделей из 350/);

  const themePage = renderIndexPage(many, '', { id: 'rusrock', label: 'Русский рок' });
  assert.equal((themePage.match(/<article class="card"/g) || []).length, 350);
  assert.doesNotMatch(themePage, /Показаны/);
});

test('every page carries the header and footer navigation', () => {
  for (const [page, prefix] of [
    [renderIndexPage([product]), ''],
    [renderProductPage(product), '../../'],
    [renderStaticPage(PAGES[0]), '../'],
  ]) {
    assert.match(page, /<header class="site-header">/);
    assert.match(page, /<footer class="site-footer">/);
    for (const { slug, nav } of PAGES) {
      assert.ok(page.includes(`href="${prefix}${slug}/"`), `нет ссылки на ${slug} при префиксе "${prefix}"`);
      assert.ok(page.includes(nav));
    }
  }
});

test('the current section is marked in the navigation', () => {
  const page = renderStaticPage(PAGES[1]);
  assert.match(page, new RegExp(`href="\\.\\./${PAGES[1].slug}/" aria-current="page"`));
});

test('static pages keep their own title and description', () => {
  for (const page of PAGES) {
    const html = renderStaticPage(page);
    assert.ok(html.includes(`<title>${page.title}</title>`));
    assert.ok(html.includes(page.description));
  }
});

// Двухслойные стоят дороже, и отличить их можно только по артикулу поставщика.
test('layered clocks are priced higher, everything else at the base price', () => {
  const layered = { ...product, vendorCode: 'moto_23.jiv' };
  assert.match(renderProductPage(layered), /class="price-new">2690 ₽/);
  assert.match(renderIndexPage([layered]), /class="price-new">2690 ₽/);

  assert.match(renderProductPage(product), /class="price-new">1890 ₽/);
  assert.match(renderIndexPage([product]), /class="price-new">1890 ₽/);
});

test('order buttons are colour-coded by channel', () => {
  const page = renderProductPage(product);
  for (const cls of ['btn-call', 'btn-wa', 'btn-max', 'btn-tg', 'btn-wb']) assert.match(page, new RegExp(cls));
});

test('escapeHtml escapes quotes and angle brackets', () => {
  assert.equal(escapeHtml(`<b>"Тест" & Co</b>`), '&lt;b&gt;&quot;Тест&quot; &amp; Co&lt;/b&gt;');
});

test('renderIndexPage embeds every product as real HTML text (no JS-only rendering)', () => {
  const html = renderIndexPage([product]);
  assert.match(html, /Локомотив Ярославль/);
  assert.match(html, /1890/);
  assert.match(html, /7000/);
  assert.match(html, /Доставка по всей России Бесплатная/);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /href="tovar\/chasy-nastennye-lokomotiv-yaroslavl\/"/);
  assert.match(html, /search\.js/);
});

// 5359 плиток × четыре ссылки = мегабайты, а заказывают всё равно со страницы товара.
test('index tiles carry no order buttons, the product page does', () => {
  const grid = renderIndexPage([product]).match(/<div class="grid">[\s\S]*?<\/div>\s*<section id="global-results"/)[0];
  assert.doesNotMatch(grid, /wa\.me|tel:|t\.me|order-buttons/);
  assert.match(renderProductPage(product), /order-buttons[\s\S]*wa\.me/);
});

test('renderIndexPage keeps the order it was given (newest first comes from the fetcher)', () => {
  const older = { ...product, nmId: 1, name: 'Старые часы' };
  const html = renderIndexPage([product, older]);
  assert.ok(html.indexOf('Локомотив Ярославль') < html.indexOf('Старые часы'));
});

test('renderProductPage sets a per-product title and meta description', () => {
  const html = renderProductPage(product);
  assert.match(html, /<title>Часы настенные &quot;Локомотив Ярославль&quot;/);
  assert.match(html, /<meta name="description" content="[^"]{20,160}"/);
  assert.match(html, /id="order-form"/);
  assert.match(html, /data-nmid="1259100136"/);
  assert.match(html, /order-form\.js/);
});

test('renderProductPage shows the full description, not truncated', () => {
  const html = renderProductPage(product);
  assert.ok(html.includes('А'.repeat(200)));
});

test('renderProductPage links back to the catalog and to WB', () => {
  const html = renderProductPage(product);
  assert.match(html, /https:\/\/max\.ru\/u\//);
  assert.match(html, /href="\.\.\/\.\.\/"/);
  assert.match(html, /https:\/\/www\.wildberries\.ru\/catalog\/1259100136\/detail\.aspx/);
  assert.match(html, /wa\.me\/79266642121/);
  assert.match(html, /t\.me\/Podarki190/);
  assert.match(html, /tel:\+79266642121/);
});

// Сайт живёт в подпапке (https://user.github.io/wall-clocks-catalog/), поэтому
// абсолютный путь вида /style.css уехал бы в корень домена и отдал 404.
// Без отпечатка в адресе браузер держит старый style.css и правки вёрстки не доезжают.
test('asset urls carry the version stamp when one is given', () => {
  assert.match(renderIndexPage([product], 'a1b2c3d4'), /href="style\.css\?v=a1b2c3d4"/);
  assert.match(renderIndexPage([product], 'a1b2c3d4'), /src="search\.js\?v=a1b2c3d4"/);
  assert.match(renderProductPage(product, 'a1b2c3d4'), /href="\.\.\/\.\.\/style\.css\?v=a1b2c3d4"/);
  assert.doesNotMatch(renderIndexPage([product]), /\?v=/);
});

test('pages never use absolute paths for their own assets', () => {
  for (const html of [renderIndexPage([product]), renderProductPage(product)]) {
    assert.doesNotMatch(html, /(href|src)="\/[^/]/);
  }
  assert.match(renderIndexPage([product]), /href="style\.css"/);
  assert.match(renderProductPage(product), /href="\.\.\/\.\.\/style\.css"/);
});

test('a mug has its own pair of prices, not the clock ones', () => {
  const mug = { ...product, subjectId: 7476, name: 'Кружка "Пандочки"' };
  const page = renderProductPage(mug);
  assert.match(page, /class="price-old">1500 ₽/);
  assert.match(page, /class="price-new">749 ₽/);
  assert.doesNotMatch(page, /7000 ₽/);

  assert.match(renderIndexPage([mug]), /class="price-new">749 ₽/);
});

test('a mug lands in its own theme, not in the clock ones', () => {
  const mug = { ...product, subjectId: 7476, name: 'Кружка "Лучшей медсестре"' };
  assert.match(renderIndexPage([mug]), /data-themes="kruzhki"/);
});

// Значки соцсетей берутся из общего спрайта, а не встраиваются в каждую
// страницу: инлайном четыре логотипа стоили бы 14 МБ на 7000 страниц.
test('the footer links to the VK group with an icon from the shared sprite', () => {
  const html = renderStaticPage(PAGES[0], 'abc123');
  assert.match(html, /href="https:\/\/vk\.com\/gravirovka_v_klinu"/);
  assert.match(html, /<use href="\.\.\/icons\.svg\?v=abc123#vk">/);
  assert.ok(!html.includes('M13.162 18.994'), 'логотип ВК не должен попадать в разметку страницы');
});

// В верхнем меню восемь пунктов не помещаются: правовая информация живёт
// только в подвале — но живёт, иначе на неё не попасть.
test('footer-only pages are kept out of the header navigation', () => {
  const legal = PAGES.find(p => p.footerOnly);
  const html = renderStaticPage(PAGES[0], '');
  const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
  assert.ok(!header.includes(legal.slug), 'правовая информация не должна быть в шапке');
  assert.ok(html.slice(html.indexOf('<footer')).includes(legal.slug), 'в подвале она нужна');
});

test('a works photo caption comes from the file name, without the sort prefix', () => {
  assert.equal(captionFromFile('12 Медальница для гимнастки.jpg'), 'Медальница для гимнастки');
  assert.equal(captionFromFile('Часы-из-дуба.JPEG'), 'Часы из дуба');
  assert.equal(captionFromFile('kubok.webp'), 'kubok');
});

// Видео на странице. Поле необязательное: почти у всех постов его нет, и
// страница без ролика не должна отличаться от той, что была до его появления.
const withVideo = {
  slug: 'panno-mnogosloynoe', date: '2026-08-24',
  title: 'T', h1: 'H', description: 'D',
  alts: ['а', 'б', 'в'], services: [], body: '<p>текст</p>',
  video: {
    oid: -106929053, id: 456239047,
    name: 'Как делают многослойные картины из фанеры',
    description: 'Панно из берёзовой фанеры',
    thumb: 'video.jpg', duration: 'PT38S', uploadDate: '2026-08-24',
  },
};

test('пост без видео не получает ни плеера, ни разметки', () => {
  const { video, ...plain } = withVideo;
  const html = renderBlogPost(plain);
  assert.ok(!html.includes('video-wrap'));
  assert.ok(!html.includes('application/ld+json'));
});

test('пост с видео встраивает плеер ВКонтакте', () => {
  const html = renderBlogPost(withVideo);
  assert.match(html, /video_ext\.php\?oid=-106929053&amp;id=456239047/);
  assert.match(html, /class="video-wrap"/);
});

test('видео описано разметкой VideoObject с абсолютными адресами', () => {
  const html = renderBlogPost(withVideo);
  const ld = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
  const data = JSON.parse(ld[1]);
  assert.equal(data['@type'], 'VideoObject');
  assert.equal(data.duration, 'PT38S');
  assert.equal(data.thumbnailUrl, 'https://lazerklin.ru/blog/panno-mnogosloynoe/video.jpg');
  assert.equal(data.contentUrl, 'https://vkvideo.ru/clip-106929053_456239047');
});

// Описание пишет человек, и однажды в нём окажется угловая скобка. Без
// экранирования закрывающий тег внутри данных обрывает <script> посреди JSON,
// и страница ниже этого места разъезжается.
test('угловые скобки в описании не рвут блок разметки', () => {
  const html = renderBlogPost({
    ...withVideo,
    video: { ...withVideo.video, description: 'Панно </script><b>подстава</b>' },
  });
  assert.ok(!html.includes('</script><b>подстава</b>'));
  const ld = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
  assert.equal(JSON.parse(ld[1]).description, 'Панно </script><b>подстава</b>');
});

// Список услуг строится из SERVICE_GROUPS, а не из SERVICES напрямую. Услуга,
// забытая в группах, получает живую страницу и строчку в карте сайта, но из
// навигации на неё не попасть — сирота, которую никто не заметит. Один раз так
// уже вышло.
test('каждая услуга попала хотя бы в одну группу списка', () => {
  const grouped = new Set(SERVICE_GROUPS.flatMap(g => g.slugs));
  assert.deepEqual(SERVICES.filter(s => !grouped.has(s.slug)).map(s => s.slug), []);
});

// И наоборот: группа, ссылающаяся на несуществующий слуг, молча теряет карточку.
test('в группах нет ссылок на несуществующие услуги', () => {
  const known = new Set(SERVICES.map(s => s.slug));
  const broken = SERVICE_GROUPS.flatMap(g => g.slugs).filter(slug => !known.has(slug));
  assert.deepEqual(broken, []);
});
