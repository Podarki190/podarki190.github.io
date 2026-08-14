// Если человек пришёл со страницы поиска (/tovar/123/#киш), стрелки должны
// переключать по его подборке, а не по всему каталогу. Список товаров лежит
// отдельным файлом и качается только в этом случае — прямой заход из поиска
// Яндекса за него не платит.
const query = decodeURIComponent(location.hash.slice(1)).trim().toLowerCase();
if (query) {
  const backLink = document.getElementById('back-link');
  backLink.href = `../../#${encodeURIComponent(query)}`;
  backLink.textContent = `← К результатам «${query}»`;

  try {
    const response = await fetch('../../catalog.json');
    if (!response.ok) throw new Error(response.status);
    const catalog = await response.json();

    const matches = catalog.filter(([, name]) => name.includes(query));
    const currentId = Number(location.pathname.split('/').filter(Boolean).pop());
    const at = matches.findIndex(([id]) => id === currentId);

    if (at !== -1) {
      setArrow('prev', matches[at - 1], query);
      setArrow('next', matches[at + 1], query);
      document.getElementById('pnav-context').textContent =
        `${at + 1} из ${matches.length} по запросу «${query}»`;
    }
  } catch {
    // список не скачался — остаются стрелки по каталогу, вшитые при сборке
  }
}

function setArrow(kind, match, query) {
  const arrow = document.getElementById(`pnav-${kind}`);
  if (match) {
    arrow.href = `../${match[0]}/#${encodeURIComponent(query)}`;
    arrow.title = match[1];
    arrow.classList.remove('pnav-off');
  } else {
    arrow.removeAttribute('href');
    arrow.removeAttribute('title');
    arrow.classList.add('pnav-off');
  }
}
