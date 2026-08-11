import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchSheetRows } from '../src/sheets.js';

test('fetchSheetRows follows the Apps Script redirect and returns rows', async () => {
  const calls = [];
  const fetchFn = async (url, opts) => {
    calls.push({ url, opts });
    if (calls.length === 1) {
      assert.equal(opts.method, 'POST');
      const body = JSON.parse(opts.body);
      assert.equal(body.secret, 'test-secret');
      assert.equal(body.action, 'read_rows');
      return new Response(null, {
        status: 302,
        headers: { location: 'https://example.com/data' },
      });
    }
    return new Response(JSON.stringify({ ok: true, rows: [{ Наименование: 'Часы X' }] }), {
      status: 200,
    });
  };

  const rows = await fetchSheetRows({ webAppUrl: 'https://script.google.com/x/exec', secret: 'test-secret', fetchFn });
  assert.equal(rows.length, 1);
  assert.equal(rows[0]['Наименование'], 'Часы X');
  assert.equal(calls.length, 2);
});

test('fetchSheetRows throws if the webapp does not redirect', async () => {
  const fetchFn = async () => new Response('oops', { status: 500 });
  await assert.rejects(() =>
    fetchSheetRows({ webAppUrl: 'https://script.google.com/x/exec', secret: 's', fetchFn })
  );
});

test('fetchSheetRows throws if the payload reports ok:false', async () => {
  const fetchFn = async (url, opts) => {
    if (!opts) return new Response(JSON.stringify({ ok: false, error: 'bad secret' }), { status: 200 });
    return new Response(null, { status: 302, headers: { location: 'https://example.com/data' } });
  };
  await assert.rejects(() =>
    fetchSheetRows({ webAppUrl: 'https://script.google.com/x/exec', secret: 's', fetchFn })
  );
});
