import { NextResponse } from 'next/server';
import { getOrder } from '../../../../lib/db';
import { getPayment } from '../../../../lib/tochka';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.PAYMENT_DIAGNOSTICS_ENABLED !== 'true') return new NextResponse(null, { status: 404 });
  const expected = process.env.TEMP_NETWORK_DIAGNOSTIC_TOKEN;
  const params = new URL(request.url).searchParams;
  if (!expected || params.get('token') !== expected) return new NextResponse(null, { status: 404 });
  const order = await getOrder(params.get('orderId'));
  if (!order?.provider_operation_id) return NextResponse.json({ success: false, errorCode: 'ORDER_OPERATION_MISSING' }, { status: 404 });

  const started = performance.now();
  try {
    const remote = await getPayment(order.provider_operation_id);
    const data = remote?.Data ?? remote?.data ?? null;
    const rawOperation = data?.Operation ?? data?.operation ?? null;
    const operationCount = Array.isArray(rawOperation) ? rawOperation.length : rawOperation ? 1 : 0;
    const operation = Array.isArray(rawOperation) ? rawOperation[0] : rawOperation;
    const amountKopecks = Number.isFinite(Number(operation?.amount)) ? Math.round(Number(operation.amount) * 100) : null;
    const merchantId = operation?.merchantId ?? operation?.merchantID ?? null;
    return NextResponse.json({
      success: true,
      region: process.env.VERCEL_REGION || 'unknown',
      durationMs: Number((performance.now() - started).toFixed(2)),
      dataPresent: Boolean(data),
      dataOperationPresent: Boolean(rawOperation),
      operationContainer: Array.isArray(rawOperation) ? 'array' : rawOperation && typeof rawOperation === 'object' ? 'object' : 'missing',
      operationCount,
      operationFieldNames: operation && typeof operation === 'object' ? Object.keys(operation).filter((key) => !/token|email|phone|name|account|customer/i.test(key)).sort() : [],
      bankStatus: typeof operation?.status === 'string' ? operation.status : null,
      operationIdMatches: operation?.operationId === order.provider_operation_id,
      amountMatches: amountKopecks === order.amount_kopecks,
      currencyMatches: typeof operation?.currency === 'string' && operation.currency === order.currency,
      merchantMatches: typeof merchantId === 'string' && merchantId === order.merchant_id
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ success: false, region: process.env.VERCEL_REGION || 'unknown', durationMs: Number((performance.now() - started).toFixed(2)), errorCode: error?.code || 'STATUS_CHECK_FAILED', providerHttpStatus: Number.isInteger(error?.status) ? error.status : null }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
