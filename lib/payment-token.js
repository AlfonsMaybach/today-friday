import crypto from 'crypto';

function secret() {
  const value = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!value) throw new Error('PAYMENT_WEBHOOK_SECRET is not configured');
  return value;
}

export function createPaymentToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${signature}`;
}

export function readPaymentToken(token) {
  if (!token || !token.includes('.')) throw new Error('Invalid payment token');
  const [body, signature] = token.split('.');
  const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url');

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error('Invalid payment token');

  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (!payload.id || !payload.createdAt || !payload.expiresAt) throw new Error('Invalid payment token');
  if (Date.now() > payload.expiresAt) throw new Error('Expired payment token');
  return payload;
}
