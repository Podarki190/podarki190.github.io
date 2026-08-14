const input = document.getElementById('search');
const cards = document.querySelectorAll('.card');
const counter = document.getElementById('search-count');

function apply(query) {
  const q = query.trim().toLowerCase();
  let shown = 0;
  for (const card of cards) {
    const match = card.dataset.name.includes(q);
    card.style.display = match ? '' : 'none';
    if (match) shown++;
  }
  counter.textContent = q ? `Найдено: ${shown}` : '';
}

// Запрос живёт в адресе страницы (#киш). Без этого «назад» со страницы товара
// возвращал в общий каталог: браузеру нечего было восстанавливать.
const fromUrl = decodeURIComponent(location.hash.slice(1));
if (fromUrl) input.value = fromUrl;
apply(input.value);

input.addEventListener('input', () => {
  apply(input.value);
  const q = input.value.trim();
  history.replaceState(null, '', q ? '#' + encodeURIComponent(q) : location.pathname);
});
