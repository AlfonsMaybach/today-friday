import { neon } from '@neondatabase/serverless';

function sql() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  return neon(process.env.DATABASE_URL);
}

export async function createOrder({ id, amountKopecks, displayAmountKopecks, paymentLinkId, currency = 'RUB' }) {
  const query = sql();
  const rows = await query`
    INSERT INTO orders (id, amount_kopecks, display_amount_kopecks, currency, payment_link_id, status)
    VALUES (${id}, ${amountKopecks}, ${displayAmountKopecks}, ${currency}, ${paymentLinkId}, 'created')
    RETURNING *`;
  return rows[0];
}

export async function getOrder(id) {
  const rows = await sql()`SELECT * FROM orders WHERE id = ${id} LIMIT 1`;
  return rows[0] || null;
}

export async function getOrderByPaymentLinkId(paymentLinkId) {
  const rows = await sql()`SELECT * FROM orders WHERE payment_link_id = ${paymentLinkId} LIMIT 1`;
  return rows[0] || null;
}

export async function updateOrder(id, patch) {
  const rows = await sql()`UPDATE orders SET
    status = COALESCE(${patch.status ?? null}, status),
    provider_operation_id = COALESCE(${patch.provider_operation_id ?? null}, provider_operation_id),
    payment_url = COALESCE(${patch.payment_url ?? null}, payment_url),
    customer_code = COALESCE(${patch.customer_code ?? null}, customer_code),
    merchant_id = COALESCE(${patch.merchant_id ?? null}, merchant_id),
    paid_at = COALESCE(${patch.paid_at ?? null}, paid_at),
    updated_at = now()
    WHERE id = ${id} RETURNING *`;
  return rows[0] || null;
}

export async function markPaidIfMatches({ orderId, operationId, amountKopecks, currency, merchantId }) {
  const rows = await sql()`UPDATE orders SET status = 'paid', provider_operation_id = ${operationId}, paid_at = COALESCE(paid_at, now()), updated_at = now()
    WHERE id = ${orderId} AND status IN ('created','pending')
      AND provider_operation_id = ${operationId}
      AND amount_kopecks = ${amountKopecks}
      AND currency = ${currency}
      AND ${merchantId}::text IS NOT NULL
      AND merchant_id IS NOT NULL
      AND merchant_id = ${merchantId}
    RETURNING id`;
  return Boolean(rows[0]);
}

export async function recordWebhook({ eventId, operationId, verified }) {
  const rows = await sql()`
    INSERT INTO payment_webhooks (event_id, operation_id, signature_verified, processed_at)
    VALUES (${eventId}, ${operationId || null}, ${verified}, now())
    ON CONFLICT (event_id) DO NOTHING
    RETURNING id`;
  return Boolean(rows[0]);
}

export async function consumeRateLimit(bucketKey, limit, windowSeconds) {
  const rows = await sql()`
    INSERT INTO rate_limits (bucket_key, window_start, request_count)
    VALUES (${bucketKey}, now(), 1)
    ON CONFLICT (bucket_key) DO UPDATE SET
      window_start = CASE WHEN rate_limits.window_start < now() - (${windowSeconds} * interval '1 second') THEN now() ELSE rate_limits.window_start END,
      request_count = CASE WHEN rate_limits.window_start < now() - (${windowSeconds} * interval '1 second') THEN 1 ELSE rate_limits.request_count + 1 END
    RETURNING request_count`;
  return rows[0].request_count <= limit;
}
