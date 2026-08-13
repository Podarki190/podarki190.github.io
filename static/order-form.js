import { buildOrderMessage, buildWhatsAppLink, buildTelegramLink } from './links.js';

const form = document.getElementById('order-form');

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const fio = document.getElementById('fio').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const address = document.getElementById('address').value.trim();

  if (!fio || !phone || !address) {
    alert('Заполните ФИО, телефон и адрес доставки');
    return;
  }

  const message = buildOrderMessage({
    name: form.dataset.name,
    nmId: form.dataset.nmid,
    fio, phone, address,
  });

  if (event.submitter.dataset.target === 'whatsapp') {
    window.open(buildWhatsAppLink(message), '_blank');
  } else {
    navigator.clipboard.writeText(message).catch(() => {});
    alert('Сообщение скопировано — вставьте его первым сообщением в Telegram');
    window.open(buildTelegramLink(), '_blank');
  }
});
