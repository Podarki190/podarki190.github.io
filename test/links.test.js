import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PHONE, TELEGRAM, ORIGINAL_PRICE, SALE_PRICE,
  buildTelLink, buildWhatsAppLink, buildTelegramLink, buildWbLink,
  buildCardWhatsAppMessage, buildOrderMessage, truncate,
} from '../src/links.js';

test('constants match the seller contact info and fixed pricing', () => {
  assert.equal(PHONE, '+79266642121');
  assert.equal(TELEGRAM, 'Podarki190');
  assert.equal(ORIGINAL_PRICE, 7000);
  assert.equal(SALE_PRICE, 1890);
});

test('buildTelLink produces a tel: link', () => {
  assert.equal(buildTelLink(), 'tel:+79266642121');
});

test('buildWhatsAppLink url-encodes the message and strips the leading +', () => {
  const link = buildWhatsAppLink('Привет мир');
  assert.ok(link.startsWith('https://wa.me/79266642121?text='));
  assert.ok(link.includes(encodeURIComponent('Привет мир')));
});

test('buildTelegramLink points at the seller username', () => {
  assert.equal(buildTelegramLink(), 'https://t.me/Podarki190');
});

test('buildWbLink builds the product detail URL from the nmID', () => {
  assert.equal(buildWbLink(1259100136), 'https://www.wildberries.ru/catalog/1259100136/detail.aspx');
});

test('buildCardWhatsAppMessage names the product and article', () => {
  const msg = buildCardWhatsAppMessage('Часы "Ярославль"', 1259100136);
  assert.match(msg, /Часы "Ярославль"/);
  assert.match(msg, /1259100136/);
});

test('buildOrderMessage includes all order fields', () => {
  const msg = buildOrderMessage({
    name: 'Часы "Ярославль"', nmId: 1259100136,
    fio: 'Иванов Иван', phone: '+79991234567', address: 'Клин, ул. Ленина 1',
  });
  assert.match(msg, /Часы "Ярославль"/);
  assert.match(msg, /1259100136/);
  assert.match(msg, /Иванов Иван/);
  assert.match(msg, /\+79991234567/);
  assert.match(msg, /Клин, ул\. Ленина 1/);
});

test('truncate leaves short text untouched', () => {
  assert.equal(truncate('коротко', 150), 'коротко');
});

test('truncate cuts long text at a word boundary and adds an ellipsis', () => {
  const text = 'а'.repeat(100) + ' ' + 'б'.repeat(100);
  const result = truncate(text, 105);
  assert.ok(result.length <= 106);
  assert.ok(result.endsWith('…'));
  assert.ok(!result.includes('б'));
});
