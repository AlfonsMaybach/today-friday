import { getPayment, extractPaymentOperation } from './tochka.js';
import { markPaidIfMatches } from './db.js';
import { validateTochkaOperation } from './payment-security.js';

const FAILED_STATUSES = new Set(['CANCELED', 'CANCELLED', 'DECLINED', 'EXPIRED']);

export async function confirmTochkaOrder(order, dependencies = {}) {
  if (order?.status === 'paid') return { status: 'paid', reason: 'ALREADY_PAID' };
  if (!order?.provider_operation_id) return { status: order?.status || 'pending', reason: 'OPERATION_MISSING' };

  const fetchPayment = dependencies.getPayment || getPayment;
  const markPaid = dependencies.markPaidIfMatches || markPaidIfMatches;
  const remote = await fetchPayment(order.provider_operation_id);
  const operation = extractPaymentOperation(remote);
  if (!operation) return { status: 'pending', reason: 'INVALID_OPERATION_STRUCTURE' };

  const check = validateTochkaOperation(order, operation);
  if (!check.identityOk) return { status: 'pending', reason: 'OPERATION_MISMATCH' };
  if (!check.ok) {
    return { status: FAILED_STATUSES.has(check.status) ? 'failed' : 'pending', reason: 'NOT_APPROVED' };
  }

  const marked = await markPaid({
    orderId: order.id,
    operationId: operation.operationId,
    amountKopecks: check.amountKopecks,
    currency: order.currency,
    merchantId: check.merchantId
  });
  return { status: marked ? 'paid' : 'pending', reason: marked ? 'CONFIRMED' : 'DATABASE_STATE_CONFLICT' };
}
