import { NextResponse } from 'next/server';
import { readPaymentToken } from '../../../lib/payment-token';
import { isFridayNow } from '../../../lib/friday';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const token = new URL(request.url).searchParams.get('token');
    const payment = readPaymentToken(token);

    if (payment.status !== 'paid') {
      return NextResponse.json({ error: 'Сначала требуется оплата.' }, { status: 402 });
    }

    const isFriday = isFridayNow();
    return NextResponse.json({
      isFriday,
      answer: isFriday ? 'ДА!' : 'НЕТ'
    });
  } catch {
    return NextResponse.json({ error: 'Недействительный платёж.' }, { status: 404 });
  }
}
