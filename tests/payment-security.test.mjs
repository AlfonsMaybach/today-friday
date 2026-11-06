import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePaymentMatch, validateOperationIdentity, validateTochkaOperation } from '../lib/payment-security.js';
import { extractPaymentOperation } from '../lib/tochka.js';
import { confirmTochkaOrder } from '../lib/payment-confirmation.js';

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

const storedOrder = { id: 'order-1', provider_operation_id: 'op-1', payment_link_id: 'link-1', amount_kopecks: 100, currency: 'RUB', merchant_id: 'm-1', status: 'pending' };
const bankOperation = { operationId: 'op-1', paymentLinkId: 'link-1', status: 'APPROVED', amount: 1, merchantId: 'm-1' };

test('extracts exactly one operation from the documented Data.Operation container', () => {
  assert.deepEqual(extractPaymentOperation({ Data: { Operation: [bankOperation] } }), bankOperation);
  assert.equal(extractPaymentOperation({ Data: { Operation: [] } }), null);
  assert.equal(extractPaymentOperation({ Data: { Operation: [bankOperation, bankOperation] } }), null);
});

test('accepts Tochka confirmation without inventing a response currency', () => {
  assert.equal(validateTochkaOperation(storedOrder, bankOperation).ok, true);
  assert.equal(validateTochkaOperation({ ...storedOrder, currency: 'EUR' }, bankOperation).ok, false);
});

for (const [name, change] of [
  ['operation', { operationId: 'op-2' }],
  ['amount', { amount: 99 }],
  ['merchant', { merchantId: 'm-2' }],
  ['payment link', { paymentLinkId: 'link-2' }],
  ['status', { status: 'AUTHORIZED' }]
]) {
  test(`rejects Tochka ${name} mismatch`, () => assert.equal(validateTochkaOperation(storedOrder, { ...bankOperation, ...change }).ok, false));
}

test('shared confirmation marks paid only after an exact bank match', async () => {
  let marked = null;
  const result = await confirmTochkaOrder(storedOrder, {
    getPayment: async () => ({ Data: { Operation: [bankOperation] } }),
    markPaidIfMatches: async (input) => { marked = input; return true; }
  });
  assert.equal(result.status, 'paid');
  assert.deepEqual(marked, { orderId: 'order-1', operationId: 'op-1', amountKopecks: 100, currency: 'RUB', merchantId: 'm-1' });
});

test('shared confirmation refuses malformed or mismatched bank operations', async () => {
  for (const response of [
    { Data: { Operation: [] } },
    { Data: { Operation: [{ ...bankOperation, amount: 2 }] } },
    { Data: { Operation: [{ ...bankOperation, merchantId: 'other' }] } }
  ]) {
    let marked = false;
    const result = await confirmTochkaOrder(storedOrder, {
      getPayment: async () => response,
      markPaidIfMatches: async () => { marked = true; return true; }
    });
    assert.equal(result.status, 'pending');
    assert.equal(marked, false);
  }
});

test('failed bank operation transitions only through guarded database update', async () => {
  let args = null;
  const result = await confirmTochkaOrder(storedOrder, {
    getPayment: async () => ({ Data: { Operation: [{ ...bankOperation, status: 'DECLINED' }] } }),
    markFailedIfMatches: async (input) => { args = input; return true; }
  });
  assert.equal(result.status, 'failed');
  assert.deepEqual(args, { orderId: storedOrder.id, operationId: storedOrder.provider_operation_id });
});

test('concurrent paid confirmation is never reported as failed by a stale poll', async () => {
  const result = await confirmTochkaOrder(storedOrder, {
    getPayment: async () => ({ Data: { Operation: [{ ...bankOperation, status: 'DECLINED' }] } }),
    markFailedIfMatches: async () => false,
    getOrder: async () => ({ ...storedOrder, status: 'paid' })
  });
  assert.equal(result.status, 'paid');
  assert.equal(result.reason, 'STATE_CHANGED');
});

test('failed update race without a paid transition stays pending', async () => {
  const result = await confirmTochkaOrder(storedOrder, {
    getPayment: async () => ({ Data: { Operation: [{ ...bankOperation, status: 'EXPIRED' }] } }),
    markFailedIfMatches: async () => false,
    getOrder: async () => ({ ...storedOrder, status: 'pending' })
  });
  assert.equal(result.status, 'pending');
});

test('concurrent successful confirmation returns paid if another poll won', async () => {
  const result = await confirmTochkaOrder(storedOrder, {
    getPayment: async () => ({ Data: { Operation: [bankOperation] } }),
    markPaidIfMatches: async () => false,
    getOrder: async () => ({ ...storedOrder, status: 'paid' })
  });
  assert.equal(result.status, 'paid');
});

test('mismatched failed operation cannot change database status', async () => {
  let changed = false;
  const result = await confirmTochkaOrder(storedOrder, {
    getPayment: async () => ({ Data: { Operation: [{ ...bankOperation, operationId: 'other', status: 'DECLINED' }] } }),
    markFailedIfMatches: async () => { changed = true; return true; }
  });
  assert.equal(result.status, 'pending');
  assert.equal(changed, false);
});
