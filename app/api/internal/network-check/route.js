import { NextResponse } from 'next/server';
import { getOrder } from '../../../../lib/db';
import { confirmTochkaOrder } from '../../../../lib/payment-confirmation';

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
    const confirmation = await confirmTochkaOrder(order);
    return NextResponse.json({
      success: true,
      region: process.env.VERCEL_REGION || 'unknown',
      durationMs: Number((performance.now() - started).toFixed(2)),
      status: confirmation.status,
      reason: confirmation.reason
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ success: false, region: process.env.VERCEL_REGION || 'unknown', durationMs: Number((performance.now() - started).toFixed(2)), errorCode: error?.code || 'STATUS_CHECK_FAILED', providerHttpStatus: Number.isInteger(error?.status) ? error.status : null }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
