const input = document.getElementById('search');
const cards = document.querySelectorAll('.card');
const counter = document.getElementById('search-count');
const globalBox = document.getElementById('global-results');

// Полный список каталога качается один раз и только когда человек начал
// печатать: на странице лежат не все товары (главная показывает 300, тема —
// свою подборку), а искать человек хочет по всему каталогу.
let catalog = null;
async function loadCatalog() {
  if (catalog) return catalog;
  try {
    const response = await fetch(new URL('catalog.json', import.meta.url));
    const list = response.ok ? await response.json() : [];
    // Нижний регистр считаем один раз при загрузке, а не на каждую букву.
    catalog = list.map(([id, name]) => [id, name, name.toLowerCase()]);
  } catch {
    catalog = [];
  }
  return catalog;
}

function filterVisible(q) {
  let shown = 0;
  for (const card of cards) {
    const match = card.dataset.name.includes(q);
    card.style.display = match ? '' : 'none';
    if (match) shown++;
  }
  return shown;
}

// Названия приходят из API WB и попадают в разметку: угловые скобки и амперсанд
// в названии не должны ломать список.
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

async function showRest(q, alreadyShown) {
  const onPage = new Set([...cards].map(card => card.dataset.name));
  const rest = (await loadCatalog())
    .filter(([, , lower]) => lower.includes(q) && !onPage.has(lower))
    .slice(0, 200);

  counter.textContent = `Найдено: ${alreadyShown + rest.length}`;
  if (rest.length === 0) { globalBox.hidden = true; return; }

  globalBox.innerHTML = `<h2>Ещё ${rest.length} из полного каталога</h2>
    <ul>${rest.map(([id, name]) =>
      `<li><a href="${new URL(`tovar/${id}/`, import.meta.url)}">${esc(name)}</a></li>`).join('')}</ul>`;
  globalBox.hidden = false;
}

function apply(query) {
  const q = query.trim().toLowerCase();
  const shown = filterVisible(q);
  counter.textContent = q ? `Найдено: ${shown}` : '';
  globalBox.hidden = true;
  if (q.length >= 2) showRest(q, shown);
}

// Запрос живёт в адресе страницы (#киш), иначе «назад» со страницы товара
// возвращал в общий каталог: браузеру нечего было восстанавливать.
const fromUrl = decodeURIComponent(location.hash.slice(1));
if (fromUrl) input.value = fromUrl;
apply(input.value);

input.addEventListener('input', () => {
  apply(input.value);
  const q = input.value.trim();
  history.replaceState(null, '', q ? `#${encodeURIComponent(q)}` : location.pathname);
});

// Запрос дописывается в ссылку в момент клика — чтобы на странице товара
// работал возврат в эту же подборку. Один обработчик на всю сетку: трогать
// 5000 ссылок на каждую букву было бы расточительно.
document.querySelector('.grid').addEventListener('click', (event) => {
  const link = event.target.closest('a[href*="tovar/"]');
  if (link && location.hash) link.href = link.getAttribute('href').split('#')[0] + location.hash;
});
