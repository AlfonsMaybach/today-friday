import { NextResponse } from 'next/server';
import { tochkaHttpsRequest, bundledTochkaCaInfo } from '../../../../lib/tochka-transport';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function safeCode(error) {
  const allowed = new Set(['EAI_AGAIN', 'ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_SOCKET', 'CERT_HAS_EXPIRED', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE']);
  let current = error;
  for (let depth = 0; current && depth < 6; depth += 1) {
    if (allowed.has(current.code)) return current.code;
    if (current.code === 'EPROTO' || String(current.code || '').startsWith('ERR_SSL_') || String(current.code || '').startsWith('ERR_TLS_')) return 'TLS_ERROR';
    current = current.cause;
  }
  return 'AUTH_REQUEST_FAILED';
}

export async function GET(request) {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.PAYMENT_DIAGNOSTICS_ENABLED !== 'true') return new NextResponse(null, { status: 404 });
  const expected = process.env.TEMP_NETWORK_DIAGNOSTIC_TOKEN;
  const queryToken = new URL(request.url).searchParams.get('token');
  if (!expected || queryToken !== expected) return new NextResponse(null, { status: 404 });
  const jwt = process.env.TOCHKA_JWT;
  if (typeof jwt !== 'string' || !jwt.trim()) return NextResponse.json({ success: false, errorCode: 'AUTH_CONFIG_MISSING' }, { status: 503 });

  const started = performance.now();
  try {
    const response = await tochkaHttpsRequest('https://enter.tochka.com/uapi/open-banking/v1.0/customers', {
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000)
    });
    const durationMs = Number((performance.now() - started).toFixed(2));
    const text = await response.text();
    let body = null;
    let jsonValid = false;
    try { body = text ? JSON.parse(text) : null; jsonValid = Boolean(body); } catch {}
    const rawCustomers = body?.Data?.Customer ?? body?.Data?.Customers ?? null;
    const customers = Array.isArray(rawCustomers) ? rawCustomers : rawCustomers ? [rawCustomers] : [];
    const business = customers.find((item) => item?.customerType === 'Business');
    return NextResponse.json({
      success: response.status === 200,
      environment: 'preview', region: process.env.VERCEL_REGION || 'unknown', caBundled: bundledTochkaCaInfo(), tlsAuthorized: true,
      httpStatus: response.status, durationMs, jsonValid, dataCustomerPresent: rawCustomers !== null,
      businessCustomerPresent: Boolean(business), customerCodePresent: typeof business?.customerCode === 'string' && business.customerCode.trim().length > 0
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ success: false, environment: 'preview', region: process.env.VERCEL_REGION || 'unknown', durationMs: Number((performance.now() - started).toFixed(2)), errorCode: safeCode(error) }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
