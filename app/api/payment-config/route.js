import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const amount = process.env.PAYMENT_PROVIDER === 'tochka'
    ? Number(process.env.PAYMENT_AMOUNT_KOPECKS || 100) / 100
    : Number(process.env.PAYMENT_AMOUNT || 99);
  return NextResponse.json({ actualAmount: amount, currency: 'RUB' }, { headers: { 'Cache-Control': 'no-store' } });
}
