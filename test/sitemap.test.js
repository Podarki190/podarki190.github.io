import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderSitemap, renderRobotsTxt } from '../src/sitemap.js';

const products = [
  { nmId: 1, name: 'A', description: '', photo: 'x' },
  { nmId: 2, name: 'B', description: '', photo: 'y' },
];

test('renderSitemap lists the homepage and every product page once each', () => {
  const xml = renderSitemap(products, 'https://example.github.io/catalog');
  assert.match(xml, /<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<loc>https:\/\/example\.github\.io\/catalog\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/example\.github\.io\/catalog\/tovar\/1\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/example\.github\.io\/catalog\/tovar\/2\/<\/loc>/);
  assert.equal(xml.match(/<loc>/g).length, 3);
});

test('renderSitemap tolerates a trailing slash in the base url', () => {
  const xml = renderSitemap(products, 'https://example.github.io/catalog/');
  assert.doesNotMatch(xml, /catalog\/\/tovar/);
});

test('renderRobotsTxt allows everything and points at the sitemap', () => {
  const txt = renderRobotsTxt('https://example.github.io/catalog');
  assert.match(txt, /User-agent: \*/);
  assert.match(txt, /Allow: \//);
  assert.match(txt, /Sitemap: https:\/\/example\.github\.io\/catalog\/sitemap\.xml/);
});
