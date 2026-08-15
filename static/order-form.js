import {
  ORDER_ENDPOINT, ORDER_SECRET, PHONE,
  buildOrderMessage, buildOrderNumber, buildWhatsAppLink, buildTelegramLink,
} from './links.js';

const form = document.getElementById('order-form');
const done = document.getElementById('order-done');
const send = document.getElementById('order-send');

const MESSENGERS = {
  whatsapp: {
    label: 'WhatsApp',
    open: (message) => window.open(buildWhatsAppLink(message), '_blank'),
    hint: 'Мы открыли WhatsApp с готовым сообщением — осталось нажать в нём «Отправить».',
  },
  telegram: {
    label: 'Telegram',
    // Telegram не даёт подставить текст в чат по ссылке, поэтому кладём в буфер.
    open: (message) => {
      navigator.clipboard?.writeText(message).catch(() => {});
      window.open(buildTelegramLink(), '_blank');
    },
    hint: 'Мы открыли Telegram, а сообщение скопировали — вставьте его в чат и отправьте.',
  },
};

function readForm() {
  const fio = document.getElementById('fio').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const address = document.getElementById('address').value.trim();
  if (!fio || !phone || !address) return null; // required в полях сам подсветит пустое
  const orderNumber = buildOrderNumber(phone);
  return {
    orderNumber, fio, phone, address,
    product: form.dataset.name,
    nmId: form.dataset.nmid,
  };
}

function showAccepted(order) {
  done.innerHTML = `
    <h2>Заказ № ${order.orderNumber} принят</h2>
    <p>Спасибо! Мы уже получили заявку на «${order.product}».</p>
    <p>Менеджер производства свяжется с вами по телефону ${order.phone},
       подтвердит заказ и назовёт срок изготовления.</p>
    <p class="order-note">Запишите номер заказа — по нему быстрее найдём вашу заявку.
       Если удобнее написать самим: <a href="tel:${PHONE}">${PHONE}</a>.</p>`;
  finish();
}

function showManual(order, messenger, message) {
  done.innerHTML = `
    <h2>Заказ № ${order.orderNumber} сформирован</h2>
    <p>${messenger.hint}</p>
    <p>Как только сообщение придёт, менеджер производства свяжется с вами,
       подтвердит заказ и срок изготовления. Спасибо, что выбрали наши часы!</p>
    <div class="order-done-actions">
      <button class="btn btn-tg" type="button" id="order-copy">Скопировать сообщение</button>
      <button class="btn btn-wa" type="button" id="order-again">Открыть ${messenger.label} снова</button>
    </div>
    <pre class="order-text">${message.replace(/</g, '&lt;')}</pre>`;
  finish();

  document.getElementById('order-again').addEventListener('click', () => messenger.open(message));
  document.getElementById('order-copy').addEventListener('click', (event) => {
    navigator.clipboard?.writeText(message).catch(() => {});
    event.target.textContent = 'Скопировано';
  });
}

function finish() {
  done.hidden = false;
  form.hidden = true;
  done.scrollIntoView({ block: 'center' });
}

// Основная кнопка: заказ уходит продавцу сам, покупателю остаётся только
// закрыть страницу. Мессенджеры ниже — запасной путь.
send?.addEventListener('click', async () => {
  const order = readForm();
  if (!order) { form.reportValidity(); return; }

  send.disabled = true;
  send.textContent = 'Отправляем…';
  try {
    // text/plain — чтобы браузер не слал предварительный OPTIONS-запрос,
    // который Apps Script не обрабатывает.
    const response = await fetch(ORDER_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...order, secret: ORDER_SECRET }),
    });
    const result = await response.json();
    if (!result.ok) throw new Error(result.error || 'отказ сервера');
    showAccepted(order);
  } catch {
    // Связь оборвалась или скрипт недоступен — не теряем покупателя,
    // а переводим его на проверенный путь через мессенджер.
    const message = buildOrderMessage(order);
    MESSENGERS.whatsapp.open(message);
    showManual(order, MESSENGERS.whatsapp, message);
  }
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const order = readForm();
  if (!order) return;
  const messenger = MESSENGERS[event.submitter.dataset.target];
  const message = buildOrderMessage(order);
  messenger.open(message);
  showManual(order, messenger, message);
});
