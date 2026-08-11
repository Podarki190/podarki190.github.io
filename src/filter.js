export function isReadyProduct(row) {
  const nmId = Number(row['Артикул WB']);
  return Number.isFinite(nmId) && nmId > 0;
}

export function toProductStub(row) {
  return {
    nmId: Number(row['Артикул WB']),
    name: row['Наименование'] || '',
    description: row['Описание'] || '',
  };
}
