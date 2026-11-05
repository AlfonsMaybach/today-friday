import dns from 'node:dns/promises';
import { NextResponse } from 'next/server';
import { tochkaHttpsRequest, bundledTochkaCaInfo } from '../../../../lib/tochka-transport';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HOST = 'enter.tochka.com';
const SAFE_CODES = new Set(['EAI_AGAIN', 'ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_SOCKET', 'CERT_HAS_EXPIRED', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE']);

function safeCode(error) {
  let current = error;
  for (let depth = 0; current && depth < 6; depth += 1) {
    if (SAFE_CODES.has(current.code)) return current.code;
    if (current.code === 'EPROTO' || String(current.code || '').startsWith('ERR_SSL_') || String(current.code || '').startsWith('ERR_TLS_')) return 'TLS_ERROR';
    if (['EHOSTUNREACH', 'ENETUNREACH', 'ECONNABORTED'].includes(current.code)) return 'CONNECTION_ERROR';
    current = current.cause;
  }
  return 'UNKNOWN_NETWORK_ERROR';
}

async function measure(task, fallbackCode = 'UNKNOWN_NETWORK_ERROR') {
  const started = performance.now();
  try { return { success: true, durationMs: Math.round(performance.now() - started), ...(await task()) }; }
  catch (error) { const code = safeCode(error); return { success: false, durationMs: Math.round(performance.now() - started), errorCode: code === 'UNKNOWN_NETWORK_ERROR' ? fallbackCode : code }; }
}

export async function GET(request) {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.PAYMENT_DIAGNOSTICS_ENABLED !== 'true') return new NextResponse(null, { status: 404 });
  const expected = process.env.TEMP_NETWORK_DIAGNOSTIC_TOKEN;
  const supplied = request.headers.get('authorization');
  const queryToken = new URL(request.url).searchParams.get('token');
  if (!expected || (supplied !== `Bearer ${expected}` && queryToken !== expected)) return new NextResponse(null, { status: 404 });

  const dnsResult = await measure(async () => { const result = await dns.lookup(HOST); return { resolved: Boolean(result.address), family: result.family }; });
  const tlsResult = await measure(async () => {
    const response = await tochkaHttpsRequest(`https://${HOST}/`, { signal: AbortSignal.timeout(10000) });
    return { authorized: true, httpStatus: response.status };
  }, 'TLS_HANDSHAKE_FAILED');
  const httpResult = await measure(async () => {
    const response = await tochkaHttpsRequest(`https://${HOST}/uapi/open-banking/v1.0/customers`, { signal: AbortSignal.timeout(10000) });
    return { httpStatus: response.status, reachable: true };
  }, 'HTTPS_CONNECTION_FAILED');

  return NextResponse.json({ environment: 'preview', region: process.env.VERCEL_REGION || 'unknown', caBundled: bundledTochkaCaInfo(), dns: dnsResult, tls: tlsResult, http: httpResult }, { headers: { 'Cache-Control': 'no-store' } });
}
