const WB_API_BASE = 'https://content-api.wildberries.ru';
const CLOCKS_SUBJECT_ID = 625; // «Часы настенные»

/**
 * Весь каталог настенных часов прямо из WB: название, описание и фото —
 * всё приходит одним ответом, гугл-таблица для сайта не нужна.
 * Возвращает [{ nmId, name, description, photo }] — только карточки с фото.
 */
export async function fetchAllClockProducts(token, { fetchFn = fetch, pageSize = 100 } = {}) {
  const byNmId = new Map(); // ключ = nmID: страницы WB могут перекрываться, дубли на сайте не нужны
  let cursor = { limit: pageSize };

  while (true) {
    const resp = await fetchFn(`${WB_API_BASE}/content/v2/get/cards/list`, {
      method: 'POST',
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings: { cursor, filter: { withPhoto: 1, objectIDs: [CLOCKS_SUBJECT_ID] } },
      }),
    });

    if (!resp.ok) {
      throw new Error(`WB Content API error ${resp.status}: ${await resp.text()}`);
    }

    const data = await resp.json();
    const cards = data.cards || [];

    for (const card of cards) {
      const photo = card.photos?.[0]?.big;
      if (!photo) continue;
      byNmId.set(card.nmID, {
        nmId: card.nmID,
        name: (card.title || '').trim(),
        description: (card.description || '').trim(),
        photo,
        createdAt: card.createdAt || '',
      });
    }

    if (cards.length < cursor.limit) break;
    const last = cards[cards.length - 1];
    cursor = { limit: pageSize, updatedAt: last.updatedAt, nmID: last.nmID };
  }

  // Новые сверху, старые партии (винил, .jiv) уезжают в конец каталога.
  return [...byNmId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
