import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchAllClockProducts } from '../src/wbCatalog.js';

const card = (nmID, extra = {}) => ({
  nmID,
  updatedAt: `2026-08-0${nmID}T00:00:00Z`,
  title: `Часы ${nmID}`,
  description: `Описание ${nmID}`,
  photos: [{ big: `https://basket-46.wbbasket.ru/${nmID}/images/big/1.webp` }],
  ...extra,
});

test('fetchAllClockProducts returns name, description and photo for every card', async () => {
  const fetchFn = async () => new Response(JSON.stringify({ cards: [card(1)] }), { status: 200 });
  const products = await fetchAllClockProducts('t', { fetchFn });
  assert.deepEqual(products, [{
    nmId: 1,
    name: 'Часы 1',
    description: 'Описание 1',
    photo: 'https://basket-46.wbbasket.ru/1/images/big/1.webp',
  }]);
});

test('fetchAllClockProducts asks WB only for wall clocks that have photos', async () => {
  const fetchFn = async (url, opts) => {
    assert.equal(url, 'https://content-api.wildberries.ru/content/v2/get/cards/list');
    assert.equal(opts.headers.Authorization, 't');
    const body = JSON.parse(opts.body);
    assert.deepEqual(body.settings.filter, { withPhoto: 1, objectIDs: [625] });
    assert.equal(body.settings.cursor.limit, 100);
    return new Response(JSON.stringify({ cards: [] }), { status: 200 });
  };
  await fetchAllClockProducts('t', { fetchFn });
});

test('fetchAllClockProducts paginates with the last card cursor until a short page', async () => {
  const calls = [];
  const fetchFn = async (url, opts) => {
    calls.push(JSON.parse(opts.body));
    const cards = calls.length === 1 ? [card(1), card(2)] : [];
    return new Response(JSON.stringify({ cards }), { status: 200 });
  };

  const products = await fetchAllClockProducts('t', { fetchFn, pageSize: 2 });
  assert.equal(products.length, 2);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].settings.cursor, { limit: 2, updatedAt: '2026-08-02T00:00:00Z', nmID: 2 });
});

test('fetchAllClockProducts keeps one entry per nmID when pages overlap', async () => {
  const calls = [];
  const fetchFn = async (url, opts) => {
    calls.push(JSON.parse(opts.body));
    const cards = calls.length === 1 ? [card(1), card(2)]
      : calls.length === 2 ? [card(2), card(3)] // WB отдал ту же карточку ещё раз
      : [];
    return new Response(JSON.stringify({ cards }), { status: 200 });
  };

  const products = await fetchAllClockProducts('t', { fetchFn, pageSize: 2 });
  assert.deepEqual(products.map(p => p.nmId), [1, 2, 3]);
});

test('fetchAllClockProducts skips cards with no photos', async () => {
  const fetchFn = async () =>
    new Response(JSON.stringify({ cards: [card(1, { photos: [] })] }), { status: 200 });
  const products = await fetchAllClockProducts('t', { fetchFn });
  assert.deepEqual(products, []);
});

test('fetchAllClockProducts defaults missing title/description to empty strings', async () => {
  const fetchFn = async () =>
    new Response(JSON.stringify({ cards: [card(1, { title: undefined, description: undefined })] }), { status: 200 });
  const [product] = await fetchAllClockProducts('t', { fetchFn });
  assert.equal(product.name, '');
  assert.equal(product.description, '');
});

test('fetchAllClockProducts throws with a readable message on API error', async () => {
  const fetchFn = async () => new Response('rate limited', { status: 429 });
  await assert.rejects(() => fetchAllClockProducts('t', { fetchFn }), /429/);
});
