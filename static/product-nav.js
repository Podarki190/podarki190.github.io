// Человек пришёл со страницы каталога с поиском или темой (#q=киш&t=muzyka) —
// вернём его в ту же подборку, а не в общий каталог.
const raw = location.hash.slice(1);
if (raw) {
  const params = raw.includes('=')
    ? new URLSearchParams(raw)
    : new URLSearchParams([['q', decodeURIComponent(raw)]]);
  const query = params.get('q');
  const backLink = document.getElementById('back-link');
  backLink.href = `../../#${raw}`;
  backLink.textContent = query ? `← К результатам «${query}»` : '← К выбранной подборке';
}
