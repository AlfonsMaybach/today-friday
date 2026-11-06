// Fail closed on Production: a public price is not a payment configuration.
// Preview and Production must both use the same 50 RUB price for live Tochka payments.
export function checkoutConfiguration(env = process.env) {
  const production = env.VERCEL_ENV === 'production';
  const provider = env.PAYMENT_PROVIDER || 'stub';
  const amountKopecks = Number(env.PAYMENT_AMOUNT_KOPECKS || 5000);
  const displayAmountKopecks = Number(env.PAYMENT_DISPLAY_AMOUNT_KOPECKS || 5000);
  const validAmount = Number.isSafeInteger(amountKopecks) && amountKopecks > 0;
  const validDisplay = Number.isSafeInteger(displayAmountKopecks) && displayAmountKopecks > 0;
  const credentialsPresent = ['DATABASE_URL', 'TOCHKA_JWT', 'PAYMENT_WEBHOOK_SECRET']
    .every((key) => typeof env[key] === 'string' && env[key].trim().length > 0);
  const liveCheckoutReady = (
    provider === 'tochka'
    && validAmount && amountKopecks === 5000
    && validDisplay && displayAmountKopecks === 5000
    && env.PAYMENT_TEST_MODE !== 'true'
    && credentialsPresent
  );
  const ready = liveCheckoutReady || (!production && env.VERCEL_ENV !== 'preview' && provider === 'stub');
  return { production, provider, amountKopecks, displayAmountKopecks, ready };
}
