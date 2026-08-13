const WB_API_BASE = 'https://content-api.wildberries.ru';
const CLOCKS_SUBJECT_ID = 625; // «Часы настенные»

export async function fetchAllClockPhotos(token, { fetchFn = fetch, pageSize = 100 } = {}) {
  const result = new Map();
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
      if (photo) result.set(card.nmID, photo);
    }

    if (cards.length < cursor.limit) break;
    const last = cards[cards.length - 1];
    cursor = { limit: pageSize, updatedAt: last.updatedAt, nmID: last.nmID };
  }

  return result;
}
