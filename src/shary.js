// Ёлочные шары с именами (24.10.2026). На WB их нет, поэтому список лежит в репозитории:
// data/shary.json собирает konstruktor\ozon_shary\sayt.py, фото — static/shary/p/<slug>_N.jpg.
// В каталоге они идут после всех часов (на главную не попадают), находятся поиском.
// static/shary/r/ — фото для озоновского кабинета Риты, на сайте не показываются.
import { readFileSync } from 'node:fs';
import { SITE_URL } from './links.js';

const LIST = JSON.parse(readFileSync(new URL('../data/shary.json', import.meta.url), 'utf8'));

export const SHARY = LIST.map(s => ({
  nmId: s.offer,
  slug: s.slug,
  name: s.title,
  description: s.opis,
  photo: `${SITE_URL}/shary/p/${s.slug}_1.jpg`,
  photos: [1, 2, 3, 4, 5].map(i => `${SITE_URL}/shary/p/${s.slug}_${i}.jpg`),
  ozon: s.ozon,
  shar: true,
}));
