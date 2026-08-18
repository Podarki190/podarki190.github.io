// Адрес страницы товара — из названия латиницей: lazerklin.ru/tovar/chasy-nastennye-pandy/.
// Раньше в адресе стоял номер WB, и ни человек, ни поисковик не понимали, что там внутри.
const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

// 70 символов — предел, после которого адрес перестаёт читаться и начинает
// обрезаться в выдаче. Режем по границе слова, чтобы не оставлять огрызков.
const MAX = 70;

export function slugify(name) {
  const latin = [...name.toLowerCase()].map(c => (c in TRANSLIT ? TRANSLIT[c] : c)).join('');
  const dashed = latin.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (dashed.length <= MAX) return dashed;
  const cut = dashed.slice(0, MAX);
  const lastDash = cut.lastIndexOf('-');
  return (lastDash > MAX / 2 ? cut.slice(0, lastDash) : cut).replace(/-+$/, '');
}

// Тёзок в каталоге почти две тысячи: десяток «Медсестёр», столько же
// «Стоматологов». Чистый адрес отдаём самому старому товару группы (у него
// меньший номер WB), остальным дописываем номер — так адрес не переедет,
// когда в каталоге появится ещё одна «Медсестра».
export function assignSlugs(products) {
  const groups = new Map();
  for (const product of products) {
    const base = slugify(product.name) || 'chasy-nastennye';
    if (!groups.has(base)) groups.set(base, []);
    groups.get(base).push(product);
  }

  const slugOf = new Map();
  for (const [base, group] of groups) {
    const [first, ...rest] = [...group].sort((a, b) => a.nmId - b.nmId);
    slugOf.set(first.nmId, base);
    for (const product of rest) slugOf.set(product.nmId, `${base}-${product.nmId}`);
  }

  return products.map(product => ({ ...product, slug: slugOf.get(product.nmId) }));
}
