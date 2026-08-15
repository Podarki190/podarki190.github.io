export const PHONE = '+79266642121';
export const TELEGRAM = 'Podarki190';
export const ORIGINAL_PRICE = 7000;
export const SALE_PRICE = 1890;
export const SHIPPING_TEXT = 'Доставка по всей России Бесплатная';

export function buildTelLink() {
  return `tel:${PHONE}`;
}

export function buildWhatsAppLink(message) {
  return `https://wa.me/${PHONE.replace('+', '')}?text=${encodeURIComponent(message)}`;
}

export function buildTelegramLink() {
  return `https://t.me/${TELEGRAM}`;
}

export function buildWbLink(nmId) {
  return `https://www.wildberries.ru/catalog/${nmId}/detail.aspx`;
}

export function buildCardWhatsAppMessage(name, nmId) {
  return `Здравствуйте! Интересуют часы «${name}» (арт. ${nmId})`;
}

// Номер заказа — последние 4 цифры телефона и дата. Покупатель узнаёт свой
// номер с одного взгляда, а у продавца два заказа с одного телефона в один
// день не сольются в один: к ним добавляется буква.
export function buildOrderNumber(phone, date = new Date()) {
  const digits = String(phone).replace(/\D/g, '');
  const tail = digits.slice(-4).padStart(4, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${tail}-${day}${month}`;
}

export function buildOrderMessage({ name, nmId, fio, phone, address, orderNumber }) {
  return [
    `Здравствуйте! Хочу заказать часы «${name}» (арт. ${nmId}).`,
    `Заказ № ${orderNumber || buildOrderNumber(phone)}`,
    `ФИО: ${fio}`,
    `Телефон: ${phone}`,
    `Город/адрес доставки: ${address}`,
  ].join('\n');
}

export function truncate(text, maxLen) {
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut) + '…';
}
