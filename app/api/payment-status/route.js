import { NextResponse } from 'next/server';
import { checkoutConfiguration } from '../../../lib/checkout-configuration';
import { readPaymentToken } from '../../../lib/payment-token';
import { getOrder, consumeRateLimit } from '../../../lib/db';
import { confirmTochkaOrder } from '../../../lib/payment-confirmation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams;
    const orderId = params.get('orderId');
    const accessToken = request.cookies.get('tf_order_access')?.value;
    const rateKey = request.cookies.get('tf_rate_key')?.value || 'anonymous';
    if (!await consumeRateLimit(`status:${rateKey}`, 60, 300)) return NextResponse.json({ error: 'Слишком много запросов.' }, { status: 429 });
    if ((process.env.PAYMENT_PROVIDER || 'stub') === 'tochka' && orderId) {
      const access = readPaymentToken(accessToken);
      if (access.type !== 'order-access' || access.id !== orderId) return NextResponse.json({ error: 'Недействительный доступ к заказу.' }, { status: 403 });
      const order = await getOrder(orderId);
      if (!order) return NextResponse.json({ error: 'Заказ не найден.' }, { status: 404 });
      if (order.status === 'paid') return NextResponse.json({ paymentId: order.provider_operation_id, status: 'paid', amount: order.amount_kopecks / 100, currency: order.currency });
      if (!order.provider_operation_id) return NextResponse.json({ paymentId: null, status: order.status, amount: order.amount_kopecks / 100, currency: order.currency });
      const confirmation = await confirmTochkaOrder(order);
      const status = confirmation.status;
      return NextResponse.json({ paymentId: order.provider_operation_id, status, amount: order.amount_kopecks / 100, currency: order.currency });
    }
    if (checkoutConfiguration().production) return NextResponse.json({ error: 'Требуется подтверждённый банковский заказ.' }, { status: 403 });
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
