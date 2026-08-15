import {
  buildOrderMessage, buildOrderNumber, buildWhatsAppLink, buildTelegramLink,
} from './links.js';

const form = document.getElementById('order-form');
const done = document.getElementById('order-done');

const CHANNELS = {
  whatsapp: {
    label: 'WhatsApp',
    open: (message) => window.open(buildWhatsAppLink(message), '_blank'),
    // В WhatsApp текст уходит прямо в ссылке — человеку остаётся нажать «отправить».
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

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const fio = document.getElementById('fio').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const address = document.getElementById('address').value.trim();
  if (!fio || !phone || !address) return; // required в полях сам подсветит пустое

  const channel = CHANNELS[event.submitter.dataset.target];
  const orderNumber = buildOrderNumber(phone);
  const message = buildOrderMessage({
    name: form.dataset.name,
    nmId: form.dataset.nmid,
    fio, phone, address, orderNumber,
  });

  channel.open(message);

  // Заказ считается принятым только после того, как сообщение уйдёт продавцу.
  // Написать «заказ принят» до отправки — соврать и потерять покупателя,
  // который решит, что больше делать нечего.
  done.innerHTML = `
    <h2>Заказ № ${orderNumber} сформирован</h2>
    <p>${channel.hint}</p>
    <p>Как только сообщение придёт, менеджер производства свяжется с вами,
       подтвердит заказ и срок изготовления. Спасибо, что выбрали наши часы!</p>
    <div class="order-done-actions">
      <button class="btn btn-tg" type="button" id="order-copy">Скопировать сообщение</button>
      <button class="btn btn-wa" type="button" id="order-again">Открыть ${channel.label} снова</button>
    </div>
    <pre class="order-text">${message.replace(/</g, '&lt;')}</pre>`;
  done.hidden = false;
  form.hidden = true;
  done.scrollIntoView({ block: 'center' });

  document.getElementById('order-again').addEventListener('click', () => channel.open(message));
  document.getElementById('order-copy').addEventListener('click', (e) => {
    navigator.clipboard?.writeText(message).catch(() => {});
    e.target.textContent = 'Скопировано';
  });
});
