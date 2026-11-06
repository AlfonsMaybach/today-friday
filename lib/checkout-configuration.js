// Fail closed on Production: a public price is not a payment configuration.
// Preview deliberately retains the 1 RUB live test setting.
export function checkoutConfiguration(env = process.env) {
  const production = env.VERCEL_ENV === 'production';
  const provider = env.PAYMENT_PROVIDER || 'stub';
  const amountKopecks = Number(env.PAYMENT_AMOUNT_KOPECKS || 100);
  const displayAmountKopecks = Number(env.PAYMENT_DISPLAY_AMOUNT_KOPECKS || 5000);
  const validAmount = Number.isSafeInteger(amountKopecks) && amountKopecks > 0;
  const validDisplay = Number.isSafeInteger(displayAmountKopecks) && displayAmountKopecks > 0;
  const credentialsPresent = ['DATABASE_URL', 'TOCHKA_JWT', 'PAYMENT_WEBHOOK_SECRET']
    .every((key) => typeof env[key] === 'string' && env[key].trim().length > 0);
  const ready = !production || (
    provider === 'tochka'
    && validAmount && amountKopecks === 5000
    && validDisplay && displayAmountKopecks === 5000
    && env.PAYMENT_TEST_MODE !== 'true'
    && credentialsPresent
  );
  return { production, provider, amountKopecks, displayAmountKopecks, ready };
}
