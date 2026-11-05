import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePaymentMatch, validateOperationIdentity } from '../lib/payment-security.js';

const order = { provider_operation_id: 'op-1', amount_kopecks: 100, currency: 'RUB', merchant_id: 'm-1' };
const valid = { operationId: 'op-1', status: 'APPROVED', amount: 1, currency: 'RUB', merchantId: 'm-1' };

test('accepts matching confirmed payment', () => assert.equal(validatePaymentMatch(order, valid).ok, true));
test('rejects missing merchant confirmation', () => assert.equal(validatePaymentMatch(order, { ...valid, merchantId: undefined }).ok, false));
test('rejects missing currency instead of defaulting to RUB', () => assert.equal(validatePaymentMatch(order, { ...valid, currency: undefined }).ok, false));
test('requires exact operation identity for polling', () => {
  assert.equal(validateOperationIdentity(order, valid), true);
  assert.equal(validateOperationIdentity(order, { ...valid, operationId: 'other' }), false);
  assert.equal(validateOperationIdentity(order, { ...valid, amount: 99 }), false);
  assert.equal(validateOperationIdentity(order, { ...valid, currency: 'EUR' }), false);
  assert.equal(validateOperationIdentity(order, { ...valid, merchantId: 'other' }), false);
});
for (const [name, change] of [['operationId', { operationId: 'op-2' }], ['amount', { amount: 99 }], ['merchant', { merchantId: 'm-2' }], ['failed', { status: 'DECLINED' }], ['late', { status: 'AUTHORIZED' }]]) {
  test(`rejects ${name} mismatch`, () => assert.equal(validatePaymentMatch(order, { ...valid, ...change }).ok, false));
}
