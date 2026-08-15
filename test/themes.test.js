import { test } from 'node:test';
import assert from 'node:assert/strict';
import { themesOf, SUBJECTS, TAGS, ALL_THEMES, OTHER_THEME } from '../src/themes.js';

const themes = (name, description = '', vendorCode = '') =>
  themesOf({ name, description, vendorCode });

test('theme ids are unique and every keyword theme has keys', () => {
  const ids = ALL_THEMES.map(t => t.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const theme of [...SUBJECTS, ...TAGS]) assert.ok(theme.keys.length > 0, theme.id);
});

test('every product gets exactly one subject theme', () => {
  const subjectIds = new Set([...SUBJECTS.map(t => t.id), OTHER_THEME.id]);
  for (const name of ['Часы настенные "Спецназ"', 'Часы настенные "Медовое время"', 'Часы "Мопс"']) {
    const found = themes(name).filter(id => subjectIds.has(id));
    assert.equal(found.length, 1, name);
  }
});

test('the obvious cases land where a buyer would expect', () => {
  assert.ok(themes('Часы настенные "Спецназ"').includes('voennym'));
  assert.ok(themes('Часы настенные "Авто УАЗ"').includes('avto'));
  assert.ok(themes('Часы настенные "Мопс на подзарядке"').includes('zhivotnye'));
  assert.ok(themes('Часы настенные "Локомотив Ярославль"').includes('kluby'));
  assert.ok(themes('Часы настенные "Ярославль"').includes('goroda'));
  assert.ok(themes('Часы настенные "Футбол во дворе"').includes('sport'));
  assert.ok(themes('Часы настенные "Лучший стоматолог"').includes('professii'));
});

test('music is split by genre, with a catch-all below the genres', () => {
  assert.ok(themes('Часы настенные "Король и Шут"').includes('rusrock'));
  assert.ok(themes('Часы настенные "Rammstein"').includes('introck'));
  assert.ok(themes('Часы настенные "Michael Jackson"').includes('pop'));
  assert.ok(themes('Часы настенные "Саксофон и джаз"').includes('jazz'));
  assert.ok(themes('Часы настенные "Гитара на стене"').includes('muzyka'));
});

test('recipient tags stack on top of the subject', () => {
  const found = themes('Часы настенные "Лучшей маме-парикмахеру"');
  assert.ok(found.includes('professii'), 'сюжет — профессия');
  assert.ok(found.includes('mame'), 'и подарок маме');
});

// Партия распознаётся по артикулу поставщика: ни в названии, ни в описании
// про двухслойное исполнение не сказано ни слова.
test('layered clocks are recognised by the supplier code', () => {
  assert.ok(themes('Часы настенные "Мотоцикл"', '', 'moto_23.jiv').includes('layered'));
  assert.ok(!themes('Часы настенные "Мотоцикл"', '', 'moto_23').includes('layered'));
});

test('vinyl is tagged from the text', () => {
  assert.ok(themes('Часы настенные Rammstein из виниловой пластинки').includes('vinyl'));
});

// Ключи ищутся с начала слова, иначе половина каталога уезжала в чужие темы.
test('keywords do not match in the middle of a word', () => {
  const inside = 'Часы для специалиста, основа из МДФ, надёжная упаковка, который служит годами';
  const found = themes('Часы настенные "Время красоты"', inside);
  assert.ok(!found.includes('zhivotnye'), 'кот/лис/сова/ёж не должны срабатывать внутри слов');
});

test('"другой" is not a friend', () => {
  assert.ok(!themes('Часы настенные "Другой взгляд на время"').includes('drugu'));
  assert.ok(themes('Часы настенные "Лучшему другу"').includes('drugu'));
});

test('the subject is read from the start of the description, not the gift pitch', () => {
  const name = 'Часы настенные "Время красоты"';
  const description = 'На циферблате — портрет девушки, ножницы и фен парикмахера. '
    + 'Диаметр 33 см. Отличный подарок в интерьер кухни, а также врачу или коллеге-военному.';
  assert.ok(themes(name, description).includes('professii'));
  assert.ok(!themes(name, description).includes('voennym'));
});

test('anything unrecognised falls back to the catch-all theme', () => {
  assert.deepEqual(themes('Часы настенные "Медовое время"'), [OTHER_THEME.id]);
});
