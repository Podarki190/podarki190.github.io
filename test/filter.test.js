// test/filter.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isReadyProduct, toProductStub } from '../src/filter.js';

test('isReadyProduct accepts a row with a numeric WB article', () => {
  assert.equal(isReadyProduct({ 'Артикул WB': 1259100136 }), true);
});

test('isReadyProduct rejects missing, non-numeric or error-value articles', () => {
  assert.equal(isReadyProduct({ 'Артикул WB': '' }), false);
  assert.equal(isReadyProduct({ 'Артикул WB': '#N/A' }), false);
  assert.equal(isReadyProduct({ 'Артикул WB': '#VALUE!' }), false);
  assert.equal(isReadyProduct({}), false);
});

test('toProductStub extracts name/description and normalizes the id to a number', () => {
  const stub = toProductStub({
    'Артикул WB': '1259100136',
    'Наименование': 'Часы настенные "Локомотив Ярославль"',
    'Описание': 'Стильные часы...',
  });
  assert.deepEqual(stub, {
    nmId: 1259100136,
    name: 'Часы настенные "Локомотив Ярославль"',
    description: 'Стильные часы...',
  });
});

test('toProductStub defaults missing text fields to empty string', () => {
  const stub = toProductStub({ 'Артикул WB': 1 });
  assert.equal(stub.name, '');
  assert.equal(stub.description, '');
});
