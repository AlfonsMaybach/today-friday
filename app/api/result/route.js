import { NextResponse } from 'next/server';
import { checkoutConfiguration } from '../../../lib/checkout-configuration';
import { readPaymentToken } from '../../../lib/payment-token';
import { isFridayNow } from '../../../lib/friday';
import { getOrder } from '../../../lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams;
    const orderId = params.get('orderId');
    const accessToken = request.cookies.get('tf_order_access')?.value;
    if ((process.env.PAYMENT_PROVIDER || 'stub') === 'tochka' && orderId) {
      const access = readPaymentToken(accessToken);
      if (access.type !== 'order-access' || access.id !== orderId) return NextResponse.json({ error: 'Недействительный доступ к заказу.' }, { status: 403 });
      const order = await getOrder(orderId);
      if (!order || order.status !== 'paid') return NextResponse.json({ error: 'Сначала требуется подтверждённая оплата.' }, { status: 402 });
      const isFriday = isFridayNow();
      return NextResponse.json({ isFriday, answer: isFriday ? 'ДА!' : 'НЕТ' });
    }
    if (checkoutConfiguration().production) return NextResponse.json({ error: 'Требуется подтверждённый банковский заказ.' }, { status: 403 });
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
