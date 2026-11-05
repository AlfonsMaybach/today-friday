import dns from 'node:dns/promises';
import tls from 'node:tls';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HOST = 'enter.tochka.com';
const SAFE_CODES = new Set(['EAI_AGAIN', 'ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_SOCKET', 'CERT_HAS_EXPIRED', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE']);

function safeCode(error) {
  let current = error;
  for (let depth = 0; current && depth < 6; depth += 1) {
    if (SAFE_CODES.has(current.code)) return current.code;
    current = current.cause;
  }
  return 'UNKNOWN_NETWORK_ERROR';
}

async function measure(task) {
  const started = performance.now();
  try { return { success: true, durationMs: Math.round(performance.now() - started), ...(await task()) }; }
  catch (error) { return { success: false, durationMs: Math.round(performance.now() - started), errorCode: safeCode(error) }; }
}

function tlsCheck() {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host: HOST, port: 443, servername: HOST, rejectUnauthorized: true, timeout: 10000 });
    socket.once('secureConnect', () => { const authorized = socket.authorized; socket.end(); resolve({ authorized }); });
    socket.once('timeout', () => { const error = new Error('timeout'); error.code = 'ETIMEDOUT'; socket.destroy(); reject(error); });
    socket.once('error', reject);
  });
}

export async function GET(request) {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.PAYMENT_DIAGNOSTICS_ENABLED !== 'true') return new NextResponse(null, { status: 404 });
  const expected = process.env.TEMP_NETWORK_DIAGNOSTIC_TOKEN;
  const supplied = request.headers.get('authorization');
  const queryToken = new URL(request.url).searchParams.get('token');
  if (!expected || (supplied !== `Bearer ${expected}` && queryToken !== expected)) return new NextResponse(null, { status: 404 });

  const dnsResult = await measure(async () => { const result = await dns.lookup(HOST); return { resolved: Boolean(result.address), family: result.family }; });
  const tlsResult = await measure(async () => tlsCheck());
  const httpResult = await measure(async () => {
    const response = await fetch(`https://${HOST}/uapi/open-banking/v1.0/customers`, { cache: 'no-store', signal: AbortSignal.timeout(10000), redirect: 'manual' });
    return { httpStatus: response.status, reachable: true };
  });

  return NextResponse.json({ environment: 'preview', region: process.env.VERCEL_REGION || 'unknown', dns: dnsResult, tls: tlsResult, http: httpResult }, { headers: { 'Cache-Control': 'no-store' } });
}
