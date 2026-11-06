import test from 'node:test';
import assert from 'node:assert/strict';
import { selectPaymentLinkCandidate } from '../lib/payment-reconciliation.js';

const order = { payment_link_id: 'tf-order-1', merchant_id: 'merchant-1', amount_kopecks: 5000, currency: 'RUB' };
const candidate = { paymentLinkId: 'tf-order-1', merchantId: 'merchant-1', amount: 50, currency: 'RUB', operationId: 'op-1' };

test('recovers only a unique exact candidate without confirming payment', () => {
  assert.deepEqual(selectPaymentLinkCandidate([candidate], order), candidate);
});
test('rejects ambiguous duplicated operations', () => {
  assert.equal(selectPaymentLinkCandidate([candidate, { ...candidate, operationId: 'op-2' }], order), null);
});
test('rejects mismatched merchant, link, amount and currency', () => {
  for (const patch of [{ merchantId: 'other' }, { paymentLinkId: 'other' }, { amount: 1 }, { currency: 'EUR' }, { currency: undefined }, { operationId: null }]) {
    assert.equal(selectPaymentLinkCandidate([{ ...candidate, ...patch }], order), null);
  }
});
test('rejects missing or malformed provider data', () => {
  for (const operations of [null, {}, [], [{ ...candidate, amount: 'oops' }]]) {
    assert.equal(selectPaymentLinkCandidate(operations, order), null);
  }
});
