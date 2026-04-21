# FlyTire

## Оновлення прайсу з пошти (XLSX)

Тепер фронтенд спочатку пробує отримати список шин з `GET /api/tires`.
Бекенд підключається до `Sent`-папки пошти, знаходить останній лист із XLSX вкладенням, парсить файл і повертає масив шин.

### Змінні оточення (`backend/.env`)


Скопіюй шаблон і заповни свої значення:

```bash
cp backend/.env.example backend/.env
```

```env
PORT=3000

# Telegram (для замовлень)
BOT_TOKEN=...
CHAT_ID=...

# IMAP (для прайсу)
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_SECURE=true
IMAP_USER=your_mail@gmail.com
IMAP_PASS=app_password
IMAP_MAILBOX=[Gmail]/Sent Mail

# Опційні фільтри
IMAP_SUBJECT_CONTAINS=price
IMAP_FROM_CONTAINS=your_mail@gmail.com
IMAP_ATTACHMENT_NAME_CONTAINS=tires
IMAP_MAX_MESSAGES_TO_SCAN=20
```

### API

- `GET /api/tires` — повертає свіжий список шин і цін із XLSX вкладення в пошті.
- `POST /api/order` — відправка замовлення в Telegram.

> Якщо `GET /api/tires` недоступний/падає, фронтенд автоматично використовує локальний `frontend/data/tires.csv` як fallback.
