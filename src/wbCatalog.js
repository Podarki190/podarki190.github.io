const WB_API_BASE = 'https://content-api.wildberries.ru';
const CLOCKS_SUBJECT_ID = 625; // «Часы настенные»

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Полный проход по каталогу — это ~54 запроса за 10 минут, и одного обрыва
 * связи хватало, чтобы уронить всю сборку. Повторяем сетевые сбои, 429 и 5xx
 * с нарастающей паузой; ошибки вроде 401 повторять бессмысленно.
 */
async function fetchWithRetry(fetchFn, url, options, { retries, delayMs }) {
  for (let attempt = 0; ; attempt++) {
    let resp, err;
    try {
      resp = await fetchFn(url, options);
    } catch (e) {
      err = e;
    }

    if (resp?.ok) return resp;

    const retriable = Boolean(err) || resp.status === 429 || resp.status >= 500;
    if (!retriable || attempt >= retries) {
      if (err) throw err;
      throw new Error(`WB Content API error ${resp.status}: ${await resp.text()}`);
    }

    await sleep(delayMs * 2 ** attempt);
  }
}

/**
 * Весь каталог настенных часов прямо из WB: название, описание и фото —
 * всё приходит одним ответом, гугл-таблица для сайта не нужна.
 * Возвращает [{ nmId, name, description, photo }] — только карточки с фото.
 */
export async function fetchAllClockProducts(token, {
  fetchFn = fetch,
  pageSize = 100,
  retries = 4,
  retryDelayMs = 2000,
} = {}) {
  const byNmId = new Map(); // ключ = nmID: страницы WB могут перекрываться, дубли на сайте не нужны
  let cursor = { limit: pageSize };

  while (true) {
    const resp = await fetchWithRetry(fetchFn, `${WB_API_BASE}/content/v2/get/cards/list`, {
      method: 'POST',
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings: { cursor, filter: { withPhoto: 1, objectIDs: [CLOCKS_SUBJECT_ID] } },
      }),
      signal: AbortSignal.timeout(120000),
    }, { retries, delayMs: retryDelayMs });

    const data = await resp.json();
    const cards = data.cards || [];

    for (const card of cards) {
      const photos = (card.photos || []).map(p => p.big).filter(Boolean);
      if (photos.length === 0) continue;
      byNmId.set(card.nmID, {
        nmId: card.nmID,
        name: (card.title || '').trim(),
        description: (card.description || '').trim(),
        photo: photos[0], // для плитки в каталоге — только первое
        photos,           // для страницы товара — все
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
