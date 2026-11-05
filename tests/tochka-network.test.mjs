import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyNetworkError, discoverCustomerAndMerchant, TochkaApiError } from '../lib/tochka.js';

test('network diagnostics keep only allowlisted cause codes', () => {
  assert.equal(classifyNetworkError({ cause: { code: 'ENOTFOUND' } }), 'ENOTFOUND');
  assert.equal(classifyNetworkError({ cause: { code: 'UND_ERR_CONNECT_TIMEOUT' } }), 'UND_ERR_CONNECT_TIMEOUT');
  assert.equal(classifyNetworkError({ cause: { code: 'SECRET_URL_VALUE' } }), 'FETCH_FAILED');
  assert.equal(classifyNetworkError(new TypeError('fetch failed')), 'FETCH_FAILED');
});

test('network diagnostics inspect nested causes without exposing unknown codes', () => {
  assert.equal(classifyNetworkError({ cause: { cause: { code: 'CERT_HAS_EXPIRED' } } }), 'CERT_HAS_EXPIRED');
  assert.equal(classifyNetworkError({ cause: { cause: { code: 'PRIVATE_TOKEN' } } }), 'FETCH_FAILED');
});

test('missing JWT is classified before fetch', async () => {
  const previous = process.env.TOCHKA_JWT;
  delete process.env.TOCHKA_JWT;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('fetch must not run'); };
  await assert.rejects(() => discoverCustomerAndMerchant(), (error) => {
    assert.ok(error instanceof TochkaApiError);
    assert.equal(error.code, 'AUTH_CONFIG_MISSING');
    assert.equal(error.status, 0);
    return true;
  });
  globalThis.fetch = originalFetch;
  if (previous === undefined) delete process.env.TOCHKA_JWT; else process.env.TOCHKA_JWT = previous;
});

test('HTTP request stage succeeds only after Response is received', async () => {
  const previous = process.env.TOCHKA_JWT;
  process.env.TOCHKA_JWT = 'test-only';
  const originalFetch = globalThis.fetch;
  const events = [];
  globalThis.fetch = async (url) => {
    if (url.includes('/open-banking/')) return new Response(JSON.stringify({ Data: { Customer: { customerType: 'Business', customerCode: 'c1' } } }), { status: 200 });
    return new Response(JSON.stringify({ Data: { Retailer: { merchantId: 'm1' } } }), { status: 200 });
  };
  await discoverCustomerAndMerchant((name, status, result) => events.push({ name, status, result }));
  const requestEvents = events.filter((event) => event.name === 'HTTP-запрос к Точке');
  assert.deepEqual(requestEvents.map((event) => event.result), ['START', 'SUCCESS', 'START', 'SUCCESS']);
  assert.equal(requestEvents[1].status, 200);
  assert.equal(requestEvents[3].status, 200);
  globalThis.fetch = originalFetch;
  if (previous === undefined) delete process.env.TOCHKA_JWT; else process.env.TOCHKA_JWT = previous;
});
