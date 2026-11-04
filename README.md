# today-friday — Vercel edition

«Сегодня пятница?» — 99 ₽ за правду.

## Что это
Версия проекта, переделанная с PHP/MySQL под Next.js + Vercel Serverless.

В текущем MVP:
- сайт работает на Vercel;
- проверка пятницы выполняется только на сервере;
- ответ нельзя получить из HTML/JS заранее;
- есть серверные API routes;
- есть тестовый платежный режим `stub`;
- при `PAYMENT_TEST_MODE=true` тестовая оплата подтверждается автоматически;
- секреты предполагаются только через Vercel Environment Variables.

## Локально

```bash
npm install
cp .env.example .env.local
npm run dev
```

Откройте http://localhost:3000

## Vercel

1. Импортируйте GitHub-репозиторий в Vercel.
2. Framework Preset должен определиться как Next.js.
3. Framework Preset: Next.js; не указывайте `Next.js default` как Build Command. Build Command должен быть пустым (Vercel использует `npm run build`) либо `next build`.
4. Добавьте Environment Variables:
   - `PAYMENT_PROVIDER=stub`
   - `PAYMENT_TEST_MODE=true` только для тестового окружения
   - `PAYMENT_AMOUNT=99`
   - `PAYMENT_CURRENCY=RUB`
   - `APP_TIMEZONE=Europe/Moscow`
   - `PAYMENT_WEBHOOK_SECRET` — длинное случайное значение, заданное как Vercel Secret
5. Deploy.

## Важно про MVP
Текущий `stub` хранит состояние платежа внутри подписанного токена, поэтому внешняя БД для тестового сценария не нужна. В production это будет заменено реальной платежной системой: сервер создаёт платеж у провайдера, а статус проверяется у провайдера/через webhook.

Никаких реальных ключей в GitHub не добавлять. Тестовый токен действует 15 минут; без `PAYMENT_WEBHOOK_SECRET` API намеренно вернёт ошибку вместо небезопасного дефолтного секрета.

## Версия v2

- Next.js обновлён до 16.3.3 (Active LTS security release).
- React / React DOM обновлены до 19.2.0.
- Требуется Node.js 20.9+.
- Удалены вспомогательные `ENV-EXAMPLE.txt` и `GITIGNORE.txt`.

## V4.1
Final city/lounge visual direction.
- Restored original full-frame photorealistic city and storm asset (`public/city-storm-v41.png`).
- Slow cinematic cloud movement and light pulses, with a reduced-motion fallback.
- Dark luxury / gold city design retained without duplicate CSS cloud shapes.
- Footer slogan: «ПОТОМУ ЧТО ПЯТНИЦА — ЭТО ВАЖНО.»
- Existing Vercel server API and payment stub retained.
