export function validatePaymentMatch(order, confirmation) {
  const amountKopecks = Math.round(Number(confirmation.amount) * 100);
  const merchantId = confirmation.merchantId || confirmation.merchantID || null;
  return confirmation.status === 'APPROVED'
    && order.provider_operation_id === confirmation.operationId
    && amountKopecks === order.amount_kopecks
    && String(confirmation.currency || '') === order.currency
    && Boolean(merchantId)
    && merchantId === order.merchant_id
    ? { ok: true, amountKopecks, merchantId }
    : { ok: false, amountKopecks, merchantId };
}

export function validateOperationIdentity(order, confirmation) {
  const amountKopecks = Math.round(Number(confirmation.amount) * 100);
  const merchantId = confirmation.merchantId || confirmation.merchantID || null;
  return Boolean(confirmation.operationId && confirmation.operationId === order.provider_operation_id
    && Number.isFinite(amountKopecks) && amountKopecks === order.amount_kopecks
    && String(confirmation.currency || '') === order.currency
    && merchantId && merchantId === order.merchant_id);
}
