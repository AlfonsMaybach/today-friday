import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { createPaymentToken } from '../../../lib/payment-token';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const provider = process.env.PAYMENT_PROVIDER || 'stub';

  if (provider !== 'stub') {
    return NextResponse.json(
      { error: 'Реальный платёжный провайдер ещё не подключён.' },
      { status: 501 }
    );
  }

  // Temporary test mode. Replace with provider-confirmed payment status
  // before accepting real money.
  const status = process.env.STUB_AUTO_PAY === 'true' ? 'paid' : 'pending';

  const payload = {
    id: crypto.randomUUID(),
    status,
    amount: Number(process.env.PAYMENT_AMOUNT || 99),
    currency: process.env.PAYMENT_CURRENCY || 'RUB',
    createdAt: Date.now()
  };

  return NextResponse.json({
    token: createPaymentToken(payload),
    status,
    amount: payload.amount,
    currency: payload.currency,
    paymentUrl: null
  });
}
