import crypto from 'crypto';

function secret() {
  return process.env.PAYMENT_WEBHOOK_SECRET || 'local-development-secret-change-me';
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
  if (!payload.id || !payload.createdAt) throw new Error('Invalid payment token');
  return payload;
}
