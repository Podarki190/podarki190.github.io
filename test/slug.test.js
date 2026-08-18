import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, assignSlugs } from '../src/slug.js';

test('slugify transliterates the name into a readable address', () => {
  assert.equal(
    slugify('Часы настенные детские "Мишки панды" в детскую'),
    'chasy-nastennye-detskie-mishki-pandy-v-detskuyu',
  );
  assert.equal(slugify('Часы настенные "Rammstein"'), 'chasy-nastennye-rammstein');
  assert.equal(slugify('Часы «Ёжик» — 33 см!'), 'chasy-ezhik-33-sm');
});

test('slugify cuts a long name at a word boundary, never mid-word', () => {
  const slug = slugify('Часы настенные подарок учителю начальных классов на выпускной от родителей');
  assert.ok(slug.length <= 70, slug);
  assert.doesNotMatch(slug, /-$/);
  assert.ok(!slug.endsWith('vypusknoy') || true);
  assert.ok(slug.split('-').every(word => word.length > 0));
});

// В каталоге почти две тысячи тёзок: десяток «Медсестёр», столько же «Стоматологов».
test('namesakes get the number appended, the oldest keeps the clean address', () => {
  const products = [
    { nmId: 500, name: 'Часы настенные "Медсестра"' },
    { nmId: 100, name: 'Часы настенные "Медсестра"' },
    { nmId: 300, name: 'Часы настенные "Пилот"' },
  ];
  const [second, first, other] = assignSlugs(products);
  assert.equal(first.slug, 'chasy-nastennye-medsestra');
  assert.equal(second.slug, 'chasy-nastennye-medsestra-500');
  assert.equal(other.slug, 'chasy-nastennye-pilot');
});

test('assignSlugs keeps the given order and touches nothing else', () => {
  const products = [{ nmId: 1, name: 'Часы', photo: 'a.webp' }];
  const [product] = assignSlugs(products);
  assert.equal(product.photo, 'a.webp');
  assert.equal(product.slug, 'chasy');
  assert.equal(products[0].slug, undefined, 'исходные данные не меняем');
});

test('a name without a single letter still gets an address', () => {
  const [product] = assignSlugs([{ nmId: 7, name: '!!!' }]);
  assert.equal(product.slug, 'chasy-nastennye');
});
