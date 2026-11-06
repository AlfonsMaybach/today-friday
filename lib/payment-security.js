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

export function validateTochkaOperation(order, operation) {
  const amountKopecks = Math.round(Number(operation?.amount) * 100);
  const merchantId = operation?.merchantId || operation?.merchantID || null;
  const paymentLinkMatches = Boolean(order.payment_link_id)
    && Boolean(operation?.paymentLinkId)
    && operation.paymentLinkId === order.payment_link_id;
  const identityOk = Boolean(operation?.operationId
    && operation.operationId === order.provider_operation_id
    && Number.isFinite(amountKopecks)
    && amountKopecks === order.amount_kopecks
    && order.currency === 'RUB'
    && merchantId
    && merchantId === order.merchant_id
    && paymentLinkMatches);
  return {
    ok: identityOk && operation.status === 'APPROVED',
    identityOk,
    amountKopecks,
    merchantId,
    status: typeof operation?.status === 'string' ? operation.status : null
  };
}
