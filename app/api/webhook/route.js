import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { recordWebhook, getOrderByPaymentLinkId } from '../../../lib/db';
import { confirmTochkaOrder } from '../../../lib/payment-confirmation';
import { tochkaHttpsRequest } from '../../../lib/tochka-transport';

export const runtime = 'nodejs';

export async function POST(request) {
  const raw = await request.text();
  const token = raw.trim();
  let publicKey = process.env.TOCHKA_WEBHOOK_PUBLIC_KEY;
  try {
    const [head, body, signature] = token.split('.');
    if (!publicKey) {
      const keyResponse = await tochkaHttpsRequest('https://enter.tochka.com/doc/openapi/static/keys/public', { signal: AbortSignal.timeout(15000) });
      if (!keyResponse.ok) throw new Error('public key unavailable');
      const jwk = JSON.parse(await keyResponse.text());
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
    const confirmation = await confirmTochkaOrder(order);
    if (confirmation.status !== 'paid') throw new Error('payment mismatch');
    const inserted = await recordWebhook({ eventId, operationId, verified: true });
    return NextResponse.json({ ok: true, duplicate: !inserted, confirmed: true });
  } catch {
    return NextResponse.json({ error: 'Invalid webhook.' }, { status: 401 });
  }
}
