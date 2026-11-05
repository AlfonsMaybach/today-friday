import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { recordWebhook, getOrderByPaymentLinkId, markPaidIfMatches } from '../../../lib/db';
import { getPayment } from '../../../lib/tochka';
import { validatePaymentMatch } from '../../../lib/payment-security';

export const runtime = 'nodejs';

export async function POST(request) {
  const raw = await request.text();
  const token = raw.trim();
  let publicKey = process.env.TOCHKA_WEBHOOK_PUBLIC_KEY;
  try {
    const [head, body, signature] = token.split('.');
    if (!publicKey) {
      const keyResponse = await fetch('https://enter.tochka.com/doc/openapi/static/keys/public', { cache: 'no-store' });
      const jwk = await keyResponse.json();
      publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
    }
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    const verified = crypto.verify('RSA-SHA256', Buffer.from(`${head}.${body}`), publicKey, Buffer.from(signature, 'base64url'));
    if (!verified) throw new Error('invalid signature');
    const eventId = decoded.eventId || decoded.id || decoded.operationId;
    const operationId = decoded.operationId || decoded.paymentId;
    const paymentLinkId = decoded.paymentLinkId || decoded.orderId;
    const order = paymentLinkId ? await getOrderByPaymentLinkId(paymentLinkId) : null;
    if (!order || !operationId || order.provider_operation_id !== operationId) throw new Error('unknown order');
    let confirmed = decoded;
    if (!decoded.amount || !decoded.currency || !decoded.merchantId) {
      const response = await getPayment(operationId);
      confirmed = response?.Data || response?.data || response;
    }
    const check = validatePaymentMatch(order, { ...confirmed, operationId });
    if (!check.ok) throw new Error('payment mismatch');
    const marked = await markPaidIfMatches({ orderId: order.id, operationId, amountKopecks: check.amountKopecks, currency: order.currency, merchantId: check.merchantId });
    const inserted = await recordWebhook({ eventId, operationId, verified: true });
    return NextResponse.json({ ok: true, duplicate: !inserted, confirmed: marked || order.status === 'paid' });
  } catch {
    return NextResponse.json({ error: 'Invalid webhook.' }, { status: 401 });
  }
}
