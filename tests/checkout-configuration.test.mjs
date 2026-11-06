import test from 'node:test';
import assert from 'node:assert/strict';
import { checkoutConfiguration } from '../lib/checkout-configuration.js';

const prod = {
  VERCEL_ENV: 'production',
  PAYMENT_PROVIDER: 'tochka',
  PAYMENT_AMOUNT_KOPECKS: '5000',
  PAYMENT_DISPLAY_AMOUNT_KOPECKS: '5000',
  PAYMENT_TEST_MODE: 'false',
  DATABASE_URL: 'present',
  TOCHKA_JWT: 'present',
  PAYMENT_WEBHOOK_SECRET: 'present'
};

test('Production accepts only explicitly configured real 50 RUB payments', () => {
  const result = checkoutConfiguration(prod);
  assert.equal(result.ready, true);
  assert.equal(result.amountKopecks, 5000);
  assert.equal(result.displayAmountKopecks, 5000);
});

for (const [name, overrides] of [
  ['stub provider', { PAYMENT_PROVIDER: 'stub' }],
  ['missing provider', { PAYMENT_PROVIDER: undefined }],
  ['preview price in Production', { PAYMENT_AMOUNT_KOPECKS: '100' }],
  ['old public price', { PAYMENT_AMOUNT_KOPECKS: '9900' }],
  ['mismatched display price', { PAYMENT_DISPLAY_AMOUNT_KOPECKS: '9900' }],
  ['invalid amount', { PAYMENT_AMOUNT_KOPECKS: 'not-a-number' }],
  ['test auto-pay mode', { PAYMENT_TEST_MODE: 'true' }],
  ['missing database', { DATABASE_URL: undefined }],
  ['missing bank auth', { TOCHKA_JWT: undefined }],
  ['missing cookie signing key', { PAYMENT_WEBHOOK_SECRET: undefined }]
]) {
  test(`Production rejects ${name}`, () => {
    assert.equal(checkoutConfiguration({ ...prod, ...overrides }).ready, false);
  });
}

test('Preview uses the same 50 RUB live price as Production', () => {
  const config = checkoutConfiguration({
    VERCEL_ENV: 'preview',
    PAYMENT_PROVIDER: 'tochka',
    PAYMENT_AMOUNT_KOPECKS: '5000',
    PAYMENT_DISPLAY_AMOUNT_KOPECKS: '5000',
    PAYMENT_TEST_MODE: 'false',
    DATABASE_URL: 'present',
    TOCHKA_JWT: 'present',
    PAYMENT_WEBHOOK_SECRET: 'present'
  });
  assert.equal(config.ready, true);
  assert.equal(config.amountKopecks, 5000);
});

test('Preview rejects an old 1 RUB live payment', () => {
  assert.equal(checkoutConfiguration({ ...prod, VERCEL_ENV: 'preview', PAYMENT_AMOUNT_KOPECKS: '100' }).ready, false);
});

test('Preview rejects missing bank credentials', () => {
  assert.equal(checkoutConfiguration({ ...prod, VERCEL_ENV: 'preview', TOCHKA_JWT: undefined }).ready, false);
});
