import { test } from 'node:test';
import assert from 'node:assert/strict';
import { themeOf, THEMES, OTHER_THEME } from '../src/themes.js';

test('theme ids are unique and every theme has keys', () => {
  const ids = THEMES.map(t => t.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const theme of THEMES) assert.ok(theme.keys.length > 0, theme.id);
});

test('the obvious cases land where a buyer would expect', () => {
  assert.equal(themeOf('Часы настенные "Спецназ"'), 'voennym');
  assert.equal(themeOf('Часы настенные "Авто УАЗ"'), 'avto');
  assert.equal(themeOf('Часы настенные "Мопс на подзарядке"'), 'pitomcy');
  assert.equal(themeOf('Часы настенные "Локомотив Ярославль"'), 'sport');
  assert.equal(themeOf('Часы настенные "Rammstein"'), 'muzyka');
  assert.equal(themeOf('Часы настенные "Лучший стоматолог"'), 'professii');
});

// Названия вроде «Лучший фтизиатр» перечислять бессмысленно — их ловит эвристика.
test('an unknown "лучший кто-то" still counts as a profession', () => {
  assert.equal(themeOf('Часы настенные "Лучший фтизиатр"'), 'professii');
  assert.equal(themeOf('Часы настенные "Лучшему маркшейдеру"'), 'professii');
});

// Но «Лучшая мама» — это семья, а не работа.
test('family beats the profession heuristic', () => {
  assert.equal(themeOf('Часы настенные "Лучшая мама"'), 'dom');
  assert.equal(themeOf('Часы настенные "Любимой бабушке"'), 'dom');
});

// Описание называет тему прямо, но только в начале: дальше идёт перечисление
// поводов и слова про интерьер, от которых всё выглядит как «для дома».
test('the subject is read from the start of the description, not the gift pitch', () => {
  const name = 'Часы настенные "Время красоты"';
  const description = 'На циферблате — портрет девушки, ножницы и фен парикмахера. '
    + 'Диаметр 33 см. Отличный подарок в интерьер кухни, дома или на дачу, '
    + 'а также врачу, автомеханику или коллеге-военному.';
  assert.equal(themeOf(name, description), 'professii');
});

test('anything unrecognised falls back to the catch-all theme', () => {
  assert.equal(themeOf('Часы настенные "Медовое время"'), OTHER_THEME.id);
});
