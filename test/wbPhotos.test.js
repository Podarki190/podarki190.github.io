import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchAllClockPhotos } from '../src/wbPhotos.js';

test('fetchAllClockPhotos maps nmID to the first photo and paginates until a short page', async () => {
  const calls = [];
  const page1 = {
    cards: Array.from({ length: 2 }, (_, i) => ({
      nmID: 100 + i,
      updatedAt: `2026-08-0${i + 1}T00:00:00Z`,
      photos: [{ big: `https://basket-46.wbbasket.ru/${100 + i}/images/big/1.webp` }],
    })),
    cursor: { total: 2 },
  };
  const page2 = { cards: [], cursor: { total: 0 } };

  const fetchFn = async (url, opts) => {
    calls.push(JSON.parse(opts.body));
    assert.equal(opts.headers.Authorization, 'test-token');
    return new Response(JSON.stringify(calls.length === 1 ? page1 : page2), { status: 200 });
  };

  const photos = await fetchAllClockPhotos('test-token', { fetchFn, pageSize: 2 });
  assert.equal(photos.get(100), 'https://basket-46.wbbasket.ru/100/images/big/1.webp');
  assert.equal(photos.get(101), 'https://basket-46.wbbasket.ru/101/images/big/1.webp');
  assert.equal(calls.length, 2);
});

test('fetchAllClockPhotos asks WB only for wall clocks that have photos', async () => {
  const fetchFn = async (url, opts) => {
    assert.equal(url, 'https://content-api.wildberries.ru/content/v2/get/cards/list');
    const body = JSON.parse(opts.body);
    assert.deepEqual(body.settings.filter, { withPhoto: 1, objectIDs: [625] });
    assert.equal(body.settings.cursor.limit, 100);
    return new Response(JSON.stringify({ cards: [] }), { status: 200 });
  };
  await fetchAllClockPhotos('t', { fetchFn });
});

test('the next page cursor carries updatedAt and nmID of the last card', async () => {
  const calls = [];
  const fetchFn = async (url, opts) => {
    calls.push(JSON.parse(opts.body));
    if (calls.length === 1) {
      return new Response(JSON.stringify({
        cards: [
          { nmID: 1, updatedAt: '2026-08-01T00:00:00Z', photos: [{ big: 'a' }] },
          { nmID: 2, updatedAt: '2026-08-02T00:00:00Z', photos: [{ big: 'b' }] },
        ],
      }), { status: 200 });
    }
    return new Response(JSON.stringify({ cards: [] }), { status: 200 });
  };

  await fetchAllClockPhotos('t', { fetchFn, pageSize: 2 });
  assert.deepEqual(calls[1].settings.cursor, { limit: 2, updatedAt: '2026-08-02T00:00:00Z', nmID: 2 });
});

test('fetchAllClockPhotos skips cards with no photos', async () => {
  const fetchFn = async () =>
    new Response(JSON.stringify({ cards: [{ nmID: 1, photos: [] }] }), { status: 200 });
  const photos = await fetchAllClockPhotos('t', { fetchFn, pageSize: 100 });
  assert.equal(photos.size, 0);
});

test('fetchAllClockPhotos throws with a readable message on API error', async () => {
  const fetchFn = async () => new Response('rate limited', { status: 429 });
  await assert.rejects(() => fetchAllClockPhotos('t', { fetchFn }), /429/);
});
