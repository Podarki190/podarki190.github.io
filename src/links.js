export const PHONE = '+79266642121';        // основной, он же WhatsApp
export const PHONE_EXTRA = '+79032203355';  // второй для звонков
export const PHONES = [PHONE, PHONE_EXTRA];

// +79266642121 → 8 (926) 664-21-21: в вёрстке телефон должен читаться так,
// как его привыкли видеть, а в ссылке tel: — строго цифрами.
export function formatPhone(phone) {
  const d = String(phone).replace(/\D/g, '');
  return `8 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}`;
}
export const TELEGRAM = 'Podarki190';
// Личный аккаунт выше — для связи, канал ниже — для соцсетей. Это разные вещи:
// в личку пишут заказ, на канал подписываются. Канал ещё и кормит Дзен через
// zen_sync_bot, поэтому подменять его личкой нельзя.
export const TELEGRAM_CHANNEL = 'lazerklin_ru';
// Подтверждение прав на сайт в вебмастерах и счётчик Метрики. Пусто — значит
// ничего лишнего в страницы не попадает; заполняется после регистрации.
export const YANDEX_VERIFICATION = '647c4b8adf060779';
export const GOOGLE_VERIFICATION = '';
export const METRIKA_ID = '111720390';

// Короткий адрес группы вместо club106929053: он читается человеком, его не
// стыдно продиктовать по телефону, и ведёт он в ту же группу 106929053.
export const VK_LINK = 'https://vk.com/gravirovka_v_klinu';
export const VK_GROUP_ID = 106929053;  // отсюда встраиваются видео из группы
export const MAX_LINK = 'https://max.ru/u/f9LHodD0cOIwDNpcDynH4_xDC6TdIuhSz9-8MWjGfbh0a3fZCqQ0JKwlGV8';
export const ORIGINAL_PRICE = 7000;
export const SALE_PRICE = 1890;
// Двухслойные дороже: другая работа, другая цена.
// У кружки своя пара цен: 7000 ₽ от часов на товаре за 749 выглядели бы обманом.
export const MUG_ORIGINAL_PRICE = 1500;
export const MUG_PRICE = 749;
export const LAYERED_PRICE = 2690;
export const SHIPPING_TEXT = 'Доставка по всей России Бесплатная';

// Куда уходит заказ с сайта: веб-приложение Apps Script пишет строку в
// гугл-таблицу заказов и шлёт уведомление в Telegram. Секрет здесь не пароль
// от чего-либо, а простой заслон от чужих запросов: он и так виден в коде
// сайта. Токен бота лежит на стороне Google и сюда не попадает.
// Настройка и код скрипта — docs/prijom-zakazov.md.
export const ORDER_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxo905W1Rw6mIJGCe1csVLNjwrz1KlFdWQV6aVVBm_4pgXl9rqzb1HMzyQH_snSNrmY/exec';
export const ORDER_SECRET = 'fwen1MfDfaEzBpHkT9Fyo_PpRYkaUm8k';

export function buildTelLink(phone = PHONE) {
  return `tel:${phone}`;
}

export function buildWhatsAppLink(message) {
  return `https://wa.me/${PHONE.replace('+', '')}?text=${encodeURIComponent(message)}`;
}

export function buildTelegramLink() {
  return `https://t.me/${TELEGRAM}`;
}

export function buildMaxLink() {
  return MAX_LINK;
}

export function buildWbLink(nmId) {
  return `https://www.wildberries.ru/catalog/${nmId}/detail.aspx`;
}

export function buildCardWhatsAppMessage(name, nmId) {
  // Нейтрально: в каталоге кроме часов есть кружки, и «интересуют часы»
  // под кружкой выглядело бы опечаткой.
  return `Здравствуйте! Интересует товар «${name}» (арт. ${nmId})`;
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

export function buildOrderMessage({ kind, name, nmId, fio, phone, address, orderNumber }) {
  if (kind === 'callback') {
    return [
      `Здравствуйте! Вопрос по услуге «${name}».`,
      `Заявка № ${orderNumber || buildOrderNumber(phone)}`,
      `Имя: ${fio}`,
      `Телефон: ${phone}`,
      `Вопрос: ${address}`,
    ].join('\n');
  }
  return [
    `Здравствуйте! Хочу заказать «${name}» (арт. ${nmId}).`,
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


// Соцсети и мессенджеры одним списком: в подвале и в контактах он должен быть
// один и тот же, иначе где-нибудь потеряется очередная ссылка.
export const SOCIALS = [
  { id: 'vk', label: 'ВКонтакте', note: 'работы, статьи и живые отзывы', href: VK_LINK },
  { id: 'tg', label: 'Telegram', note: 'работы и новости мастерской', href: `https://t.me/${TELEGRAM_CHANNEL}` },
  { id: 'wa', label: 'WhatsApp', note: formatPhone(PHONE), href: `https://wa.me/${PHONE.replace('+', '')}` },
  { id: 'max', label: 'Макс', note: formatPhone(PHONE), href: MAX_LINK },
];

// Значки берутся из общего спрайта icons.svg — по ссылке, а не инлайном:
// на 7000 страницах четыре встроенных логотипа весили бы 14 МБ.
// prefix — путь до корня сайта, withNote — подпись под названием (контакты).
export function renderSocials({ prefix = '../', v = '', withNote = false } = {}) {
  const items = SOCIALS.map(s => `<li><a class="social social-${s.id}" href="${s.href}" target="_blank" rel="noopener">
    <svg class="social-icon" aria-hidden="true"><use href="${prefix}icons.svg${v}#${s.id}"></use></svg>
    <span class="social-text">${s.label}${withNote ? `<small>${s.note}</small>` : ''}</span>
  </a></li>`).join('\n  ');
  return `<ul class="socials${withNote ? ' socials-wide' : ''}">
  ${items}
</ul>`;
}
