import https from 'node:https';
import tls from 'node:tls';
import { readFileSync } from 'node:fs';

const rootCa = readFileSync(new URL('../certs/russian_trusted_root_ca.pem', import.meta.url), 'utf8');
const subCa = readFileSync(new URL('../certs/russian_trusted_sub_ca.pem', import.meta.url), 'utf8');

const tochkaAgent = new https.Agent({
  ca: [...tls.rootCertificates, rootCa, subCa],
  keepAlive: true,
  rejectUnauthorized: true
});

export function tochkaHttpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    if (target.protocol !== 'https:' || target.hostname !== 'enter.tochka.com') {
      reject(Object.assign(new Error('Unsupported Tochka API origin'), { code: 'INVALID_TOCHKA_ORIGIN' }));
      return;
    }

    const request = https.request(target, {
      agent: tochkaAgent,
      method: options.method || 'GET',
      headers: options.headers,
      signal: options.signal,
      servername: target.hostname,
      rejectUnauthorized: true
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve({
        status: response.statusCode || 0,
        ok: Boolean(response.statusCode && response.statusCode >= 200 && response.statusCode < 300),
        text: async () => Buffer.concat(chunks).toString('utf8')
      }));
    });
    request.on('error', reject);
    if (options.body) request.write(options.body);
    request.end();
  });
}

export function bundledTochkaCaInfo() {
  return { rootPem: rootCa.includes('BEGIN CERTIFICATE'), subPem: subCa.includes('BEGIN CERTIFICATE') };
}
