import test from 'node:test';
import assert from 'node:assert/strict';

process.env.PAYMENT_WEBHOOK_SECRET = 'test-secret-only';
const { createPaymentToken, readPaymentToken } = await import('../lib/payment-token.js');

test('order access token is signed and bound to an order', () => {
  const token = createPaymentToken({ id: 'order-1', type: 'order-access', createdAt: Date.now(), expiresAt: Date.now() + 60_000 });
  assert.deepEqual(readPaymentToken(token).id, 'order-1');
  assert.throws(() => readPaymentToken(`${token}x`));
});

test('expired access token is rejected', () => {
  const token = createPaymentToken({ id: 'order-2', type: 'order-access', createdAt: Date.now() - 120_000, expiresAt: Date.now() - 1 });
  assert.throws(() => readPaymentToken(token), /Expired/);
});
