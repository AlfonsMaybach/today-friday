import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPaymentData } from '../lib/tochka.js';

test('receipt request uses documented amount and service fiscal fields', () => {
  const data = buildPaymentData({ customerCode: '300000092', merchantId: '200000000001056', amount: 50, paymentLinkId: 'tf-test', email: 'test@example.com', redirectUrl: 'https://example.com', failRedirectUrl: 'https://example.com/fail' });
  assert.equal(data.merchantId, '200000000001056');
  assert.equal(data.Items[0].amount, 50);
  assert.equal(data.Items[0].paymentObject, 'service');
  assert.equal(data.Items[0].paymentMethod, 'full_payment');
  assert.equal('price' in data.Items[0], false);
});
