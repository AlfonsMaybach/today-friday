import { NextResponse } from 'next/server';
import { readPaymentToken } from '../../../lib/payment-token';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const token = new URL(request.url).searchParams.get('token');
    const payment = readPaymentToken(token);

    return NextResponse.json({
      paymentId: payment.id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency
    });
  } catch {
    return NextResponse.json({ error: 'Платёж не найден.' }, { status: 404 });
  }
}
