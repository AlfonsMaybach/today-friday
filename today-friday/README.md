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
- при `STUB_AUTO_PAY=true` тестовая оплата подтверждается автоматически;
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
3. Build Command: `next build` (обычно автоматически).
4. Добавьте Environment Variables:
   - `PAYMENT_PROVIDER=stub`
   - `STUB_AUTO_PAY=true`
   - `PAYMENT_AMOUNT=99`
   - `PAYMENT_CURRENCY=RUB`
   - `APP_TIMEZONE=Europe/Moscow`
5. Deploy.

## Важно про MVP
Текущий `stub` хранит состояние платежа внутри подписанного токена, поэтому внешняя БД для тестового сценария не нужна. В production это будет заменено реальной платежной системой: сервер создаёт платеж у провайдера, а статус проверяется у провайдера/через webhook.

Никаких реальных ключей в GitHub не добавлять.
