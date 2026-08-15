# Автоматический приём заказов

Цель: покупатель жмёт «Оформить заказ» → видит «Заказ принят» → заказ сам падает
продавцу. Никаких мессенджеров, копирований и «вставьте сообщение».

## Почему именно так

Сайт статический, своего сервера нет. Значит, отправлять заказ должен кто-то на
стороне. Варианты, которые рассматривались:

| вариант | почему не он |
|---|---|
| Бот Telegram прямо из браузера | Токен бота попадёт в код сайта, а код открыт всем. Любой сможет писать от имени бота. |
| Formspree и подобные | Ещё один платный сервис и чужое хранилище с телефонами покупателей. |
| Своя функция на Cloudflare/Vercel | Работает, но это ещё один аккаунт и ещё одно место, где что-то ломается. |
| **Google Apps Script** | **Выбран.** Аккаунт уже есть, скрипт уже используется для карточек. Заказы падают в гугл-таблицу — это и есть готовая панель заказов. Токен бота лежит на стороне Google, в браузер не попадает. |

## Что нужно сделать один раз

### 1. Таблица заказов
Создать гугл-таблицу «Заказы с сайта», первая строка — заголовки:
`Дата | Номер заказа | Товар | Артикул WB | ФИО | Телефон | Адрес`

### 2. Бот в Telegram (чтобы заказ прилетал уведомлением)
1. Написать [@BotFather](https://t.me/BotFather) → `/newbot` → получить токен.
2. Написать своему новому боту любое сообщение (иначе он не сможет вам ответить).
3. Открыть `https://api.telegram.org/bot<ТОКЕН>/getUpdates` и найти там `"chat":{"id":123456789}` — это ваш ID.

### 3. Скрипт
В таблице: Расширения → Apps Script, вставить код ниже, заменить три строки
вверху. Затем Развернуть → Новое развёртывание → тип «Веб-приложение»,
доступ «Все», и скопировать полученный адрес — его нужно прислать мне.

```js
const SECRET = 'придумайте_длинную_строку';   // тот же секрет пропишем на сайте
const TG_TOKEN = '';                          // токен бота из BotFather
const TG_CHAT = '';                           // ваш ID из getUpdates

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.secret !== SECRET) return reply({ ok: false, error: 'нет доступа' });

    SpreadsheetApp.getActiveSpreadsheet().getSheets()[0].appendRow([
      new Date(), data.orderNumber, data.product, data.nmId,
      data.fio, data.phone, data.address,
    ]);

    if (TG_TOKEN && TG_CHAT) {
      const text = [
        'Новый заказ с сайта № ' + data.orderNumber,
        data.product + ' (арт. ' + data.nmId + ')',
        'ФИО: ' + data.fio,
        'Телефон: ' + data.phone,
        'Адрес: ' + data.address,
      ].join('\n');
      UrlFetchApp.fetch('https://api.telegram.org/bot' + TG_TOKEN + '/sendMessage', {
        method: 'post',
        payload: { chat_id: TG_CHAT, text: text },
        muteHttpExceptions: true,
      });
    }

    return reply({ ok: true });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  }
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

### 4. Прислать мне
- адрес веб-приложения (…/exec)
- придуманный секрет

Я пропишу их в `src/links.js` и включу автоматическую отправку.

## Что получится

- Покупатель заполняет три поля, жмёт кнопку — видит «Заказ № 2121-1508 принят».
- Строка появляется в таблице, уведомление приходит в Telegram.
- Кнопки WhatsApp и Telegram остаются как запасной путь, если у человека
  пропала связь ровно в этот момент.
