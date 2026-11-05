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

  const totalStarted = performance.now();
  try {
    const customersStarted = performance.now();
    const customersResponse = await tochkaHttpsRequest('https://enter.tochka.com/uapi/open-banking/v1.0/customers', {
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000)
    });
    const customersDurationMs = Number((performance.now() - customersStarted).toFixed(2));
    const customersText = await customersResponse.text();
    let customersBody = null;
    let customersJsonValid = false;
    try { customersBody = customersText ? JSON.parse(customersText) : null; customersJsonValid = Boolean(customersBody); } catch {}
    const rawCustomers = customersBody?.Data?.Customer ?? customersBody?.Data?.Customers ?? null;
    const customers = Array.isArray(rawCustomers) ? rawCustomers : rawCustomers ? [rawCustomers] : [];
    const business = customers.find((item) => item?.customerType === 'Business');
    const customerCode = typeof business?.customerCode === 'string' ? business.customerCode.trim() : '';
    if (customersResponse.status !== 200 || !customerCode) {
      return NextResponse.json({ success: false, environment: 'preview', region: process.env.VERCEL_REGION || 'unknown', customersHttpStatus: customersResponse.status, customersDurationMs, customersJsonValid, businessCustomerPresent: Boolean(business), customerCodePresent: Boolean(customerCode), retailersRequestPerformed: false }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const retailersStarted = performance.now();
    const retailersResponse = await tochkaHttpsRequest(`https://enter.tochka.com/uapi/acquiring/v1.0/retailers?customerCode=${encodeURIComponent(customerCode)}`, {
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000)
    });
    const retailersDurationMs = Number((performance.now() - retailersStarted).toFixed(2));
    const retailersText = await retailersResponse.text();
    let retailersBody = null;
    let retailersJsonValid = false;
    try { retailersBody = retailersText ? JSON.parse(retailersText) : null; retailersJsonValid = Boolean(retailersBody); } catch {}
    const rawRetailers = retailersBody?.Data?.Retailer ?? retailersBody?.Data?.Retailers ?? retailersBody?.Data ?? null;
    const retailers = Array.isArray(rawRetailers) ? rawRetailers : rawRetailers ? [rawRetailers] : [];
    const withMerchantId = retailers.filter((item) => typeof item?.merchantId === 'string' && item.merchantId.trim().length > 0);
    const activeRegistered = retailers.filter((item) => item?.status === 'REG' && item?.isActive === true);
    return NextResponse.json({
      success: retailersResponse.status === 200 && retailersJsonValid && retailers.length > 0 && withMerchantId.length > 0,
      environment: 'preview', region: process.env.VERCEL_REGION || 'unknown', caBundled: bundledTochkaCaInfo(), tlsAuthorized: true,
      customersHttpStatus: customersResponse.status, customersDurationMs, customersJsonValid, businessCustomerPresent: true, customerCodePresent: true,
      retailersHttpStatus: retailersResponse.status, retailersDurationMs, retailersJsonValid,
      retailerCount: retailers.length, merchantIdPresentCount: withMerchantId.length,
      activeRegisteredCount: activeRegistered.length, activeRegisteredPresent: activeRegistered.length > 0,
      multipleRetailers: retailers.length > 1, requiresPurposeReview: retailers.length > 1,
      totalDurationMs: Number((performance.now() - totalStarted).toFixed(2))
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ success: false, environment: 'preview', region: process.env.VERCEL_REGION || 'unknown', totalDurationMs: Number((performance.now() - totalStarted).toFixed(2)), errorCode: safeCode(error) }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
