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

export function buildOrderMessage({ name, nmId, fio, phone, address }) {
  return [
    `Здравствуйте! Хочу заказать часы «${name}» (арт. ${nmId}).`,
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
