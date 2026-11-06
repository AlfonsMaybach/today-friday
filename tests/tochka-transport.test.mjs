import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { X509Certificate } from 'node:crypto';
import { bundledTochkaCaInfo, tochkaHttpsRequest } from '../lib/tochka-transport.js';

test('official Russian Trusted CA files are valid PEM and form a chain', () => {
  const root = new X509Certificate(readFileSync(new URL('../certs/russian_trusted_root_ca.pem', import.meta.url)));
  const sub = new X509Certificate(readFileSync(new URL('../certs/russian_trusted_sub_ca.pem', import.meta.url)));
  assert.match(root.subject, /Russian Trusted Root CA/);
  assert.match(sub.subject, /Russian Trusted Sub CA/);
  assert.match(sub.issuer, /Russian Trusted Root CA/);
  assert.equal(root.verify(root.publicKey), true);
  assert.equal(sub.verify(root.publicKey), true);
  assert.deepEqual(bundledTochkaCaInfo(), { rootPem: true, subPem: true });
});

test('custom CA transport is restricted to enter.tochka.com', async () => {
  await assert.rejects(() => tochkaHttpsRequest('https://example.com/'), (error) => error.code === 'INVALID_TOCHKA_ORIGIN');
});
