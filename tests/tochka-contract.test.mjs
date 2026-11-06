import test from 'node:test';
import assert from 'node:assert/strict';
import { discoverCustomerAndMerchant, buildPaymentData, extractPaymentOperation, TochkaApiError } from '../lib/tochka.js';

test('discovers business customer and active registered merchant from Data arrays', async () => {
  const original = process.env.TOCHKA_JWT;
  process.env.TOCHKA_JWT = 'ci-fake-token';
  const calls = [];
  try {
    const requestFn = async (url, options) => {
      calls.push({ url, options });
      const body = url.includes('/customers')
        ? { Data: { Customer: [{ customerType: 'Private', customerCode: 'p' }, { customerType: 'Business', customerCode: 'business' }] } }
        : { Data: { Retailer: [{ merchantId: 'inactive', status: 'REG', isActive: false }, { merchantId: 'active', status: 'REG', isActive: true }] } };
      return { ok: true, status: 200, text: async () => JSON.stringify(body) };
    };
    const result = await discoverCustomerAndMerchant(null, requestFn);
    assert.deepEqual(result, { customerCode: 'business', merchantId: 'active' });
    assert.equal(calls.length, 2);
    assert.match(calls[1].url, /customerCode=business/);
    assert.equal(calls[0].options.headers.Authorization, 'Bearer ci-fake-token');
  } finally {
    if (original === undefined) delete process.env.TOCHKA_JWT;
    else process.env.TOCHKA_JWT = original;
  }
});

test('fails closed on malformed retailer response', async () => {
  const original = process.env.TOCHKA_JWT;
  process.env.TOCHKA_JWT = 'ci-fake-token';
  try {
    await assert.rejects(discoverCustomerAndMerchant(null, async (url) => ({
      ok: true, status: 200,
      text: async () => JSON.stringify(url.includes('/customers')
        ? { Data: { Customer: [{ customerType: 'Business', customerCode: 'b' }] } }
        : { Data: { Retailer: [{}] } })
    })), (error) => error instanceof TochkaApiError && error.code === 'INVALID_RESPONSE_STRUCTURE');
  } finally {
    if (original === undefined) delete process.env.TOCHKA_JWT;
    else process.env.TOCHKA_JWT = original;
  }
});

test('bank receipt request uses exactly 50 RUB and one non-VAT service item', () => {
  const data = buildPaymentData({
    customerCode: 'customer', merchantId: 'merchant', amount: 50,
    paymentLinkId: 'tf-1', email: 'test@example.com',
    redirectUrl: 'https://example.com/?payment=1',
    failRedirectUrl: 'https://example.com/?payment=failed'
  });
  assert.equal(data.amount, 50);
  assert.equal(data.paymentLinkId, 'tf-1');
  assert.deepEqual(data.paymentMode, ['sbp']);
  assert.equal(data.Items.length, 1);
  assert.equal(data.Items[0].amount, 50);
  assert.equal(data.Items[0].vatType, 'none');
  assert.equal(data.Client.email, 'test@example.com');
});

test('bank response parser rejects multiple operations', () => {
  assert.equal(extractPaymentOperation({ Data: { Operation: [{ operationId: 'a' }, { operationId: 'b' }] } }), null);
});
