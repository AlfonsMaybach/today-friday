# Временная диагностика платежа

Диагностика включается только при одновременных условиях:

- `VERCEL_ENV=preview`;
- `PAYMENT_DIAGNOSTICS_ENABLED=true`.

Для удаления после испытаний удалите `app/components/DiagnosticPanel.js`, `lib/payment-diagnostics.js`, связанные стили и вызовы `DiagnosticPanel` из `app/page.js`, затем удалите переменную `PAYMENT_DIAGNOSTICS_ENABLED` из Preview Vercel. Бизнес-логику платежей, webhook и проверки оплаты удалять нельзя.
