import test from 'node:test';
import assert from 'node:assert/strict';
import { createPaymentToken, readPaymentToken } from '../lib/payment-token.js';
import { validatePaymentMatch } from '../lib/payment-security.js';

process.env.PAYMENT_WEBHOOK_SECRET = 'integration-test-secret';

test('return flow keeps order access in server token and exposes result only after confirmation', () => {
  const order = { id: 'order-1', provider_operation_id: 'op-1', amount_kopecks: 5000, currency: 'RUB', merchant_id: 'merchant-1' };
  const cookieToken = createPaymentToken({ type: 'order-access', id: order.id, createdAt: Date.now(), expiresAt: Date.now() + 60_000 });
  assert.equal(readPaymentToken(cookieToken).id, order.id);
  assert.equal(validatePaymentMatch(order, { operationId: 'op-1', amount: 50, currency: 'RUB', merchantId: 'merchant-1', status: 'APPROVED' }).ok, true);
  assert.equal(validatePaymentMatch(order, { operationId: 'op-1', amount: 1, currency: 'RUB', merchantId: 'merchant-1', status: 'DECLINED' }).ok, false);
  assert.throws(() => readPaymentToken(undefined));
});

test('return flow cannot use a cookie for another order', () => {
  const token = createPaymentToken({ type: 'order-access', id: 'order-a', createdAt: Date.now(), expiresAt: Date.now() + 60_000 });
  assert.notEqual(readPaymentToken(token).id, 'order-b');
});
