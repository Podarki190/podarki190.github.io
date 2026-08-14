// Человек пришёл со страницы поиска (/tovar/123/#киш) — вернём его в его же
// подборку, а не в общий каталог.
const query = decodeURIComponent(location.hash.slice(1)).trim();
if (query) {
  const backLink = document.getElementById('back-link');
  backLink.href = `../../#${encodeURIComponent(query)}`;
  backLink.textContent = `← К результатам «${query}»`;
}
