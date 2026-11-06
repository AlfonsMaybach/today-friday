import { NextResponse } from 'next/server';
import { checkoutConfiguration } from '../../../lib/checkout-configuration';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const config = checkoutConfiguration();
  if (!config.ready) return NextResponse.json({ error: 'Оплата временно недоступна.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  const amount = config.provider === 'tochka'
    ? config.amountKopecks / 100
    : Number(process.env.PAYMENT_AMOUNT || 50);
  return NextResponse.json({ actualAmount: amount, currency: 'RUB' }, { headers: { 'Cache-Control': 'no-store' } });
}
