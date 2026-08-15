// Человек пришёл со страницы каталога с поиском — вернём его в ту же подборку.
const query = decodeURIComponent(location.hash.slice(1)).trim();
if (query) {
  const backLink = document.getElementById('back-link');
  backLink.href = `../../#${encodeURIComponent(query)}`;
  backLink.textContent = `← К результатам «${query}»`;
}
