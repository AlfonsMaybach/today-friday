/**
 * Read-only reconciliation helper. Does not call Tochka or modify Neon.
 * An operation may be recovered only when the bank response has exactly one
 * candidate matching the original link, amount, currency and merchant.
 * Never auto-approve a payment based on this lookup alone.
 */
export function selectPaymentLinkCandidate(operations, order) {
  if (!Array.isArray(operations) || !order?.payment_link_id || !order?.merchant_id || !Number.isInteger(order?.amount_kopecks)) return null;
  const matches = operations.filter((op) => {
    if (!op || typeof op !== 'object') return false;
    if (String(op.paymentLinkId || '') !== String(order.payment_link_id)) return false;
    if (String(op.merchantId || '') !== String(order.merchant_id)) return false;
    if (op.currency !== order.currency) return false;
    if (!Number.isFinite(Number(op.amount)) || Math.round(Number(op.amount) * 100) !== order.amount_kopecks) return false;
    return typeof op.operationId === 'string' && op.operationId.length > 0;
  });
  return matches.length === 1 ? matches[0] : null;
}
