const input = document.getElementById('search');
const cards = document.querySelectorAll('.card');
const counter = document.getElementById('search-count');
const chips = document.getElementById('chips');

let theme = '';

function apply() {
  const q = input.value.trim().toLowerCase();
  let shown = 0;
  for (const card of cards) {
    const match = card.dataset.name.includes(q) && (!theme || card.dataset.theme === theme);
    card.style.display = match ? '' : 'none';
    if (match) shown++;
  }
  counter.textContent = q || theme ? `Найдено: ${shown}` : '';
}

// Запрос и тема живут в адресе страницы (#q=киш&t=avto). Без этого «назад»
// со страницы товара возвращал в общий каталог: браузеру нечего было
// восстанавливать. Старый формат #киш тоже понимаем — ссылки уже разошлись.
function readHash() {
  const raw = location.hash.slice(1);
  if (!raw) return { q: '', t: '' };
  if (!raw.includes('=')) return { q: decodeURIComponent(raw), t: '' };
  const params = new URLSearchParams(raw);
  return { q: params.get('q') || '', t: params.get('t') || '' };
}

function writeHash() {
  const params = new URLSearchParams();
  if (input.value.trim()) params.set('q', input.value.trim());
  if (theme) params.set('t', theme);
  const hash = params.toString();
  history.replaceState(null, '', hash ? `#${hash}` : location.pathname);
}

function markChips() {
  for (const chip of chips.querySelectorAll('.chip')) {
    chip.setAttribute('aria-pressed', String(chip.dataset.theme === theme));
  }
}

const initial = readHash();
input.value = initial.q;
theme = initial.t;
markChips();
apply();

input.addEventListener('input', () => { apply(); writeHash(); });

chips.addEventListener('click', (event) => {
  const chip = event.target.closest('.chip');
  if (!chip) return;
  theme = chip.dataset.theme === theme ? '' : chip.dataset.theme;
  markChips();
  apply();
  writeHash();
});

// Запрос дописывается в ссылку в момент клика — чтобы на странице товара
// работал возврат в эту же подборку. Один обработчик на всю сетку: трогать
// 5000 ссылок на каждую букву было бы расточительно.
document.querySelector('.grid').addEventListener('click', (event) => {
  const link = event.target.closest('a[href^="tovar/"]');
  if (!link) return;
  const hash = location.hash;
  if (hash) link.href = link.getAttribute('href').split('#')[0] + hash;
});
