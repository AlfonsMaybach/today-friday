const BASE_URL = 'https://enter.tochka.com/uapi';

export class TochkaApiError extends Error {
  constructor({ stage, status, code, requestId }) {
    super(`Точка API error at ${stage}`);
    this.name = 'TochkaApiError'; this.stage = stage; this.status = status || 0; this.code = code || 'TOCHKA_API_ERROR'; this.requestId = requestId || null;
  }
}

const SAFE_NETWORK_CODES = new Set(['EAI_AGAIN', 'ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_SOCKET', 'CERT_HAS_EXPIRED', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE']);

export function classifyNetworkError(error) {
  let current = error;
  for (let depth = 0; current && depth < 5; depth += 1) {
    const code = current?.code;
    if (typeof code === 'string' && SAFE_NETWORK_CODES.has(code)) return code;
    current = current?.cause;
  }
  return 'FETCH_FAILED';
}

function authHeaders() {
  if (typeof process.env.TOCHKA_JWT !== 'string' || !process.env.TOCHKA_JWT.trim()) {
    throw new TochkaApiError({ stage: 'auth-config', code: 'AUTH_CONFIG_MISSING' });
  }
  return { Authorization: `Bearer ${process.env.TOCHKA_JWT}`, 'Content-Type': 'application/json' };
}

async function tochka(path, options = {}, stage = path, onStage = null) {
  let headers;
  try { headers = { ...authHeaders(), ...(options.headers || {}) }; }
  catch (error) { throw error instanceof TochkaApiError ? error : new TochkaApiError({ stage: `${stage}:auth-config`, code: 'AUTH_CONFIG_MISSING' }); }
  let response;
  onStage?.('HTTP-запрос к Точке', null, 'START');
  try { response = await fetch(`${BASE_URL}${path}`, { ...options, headers, cache: 'no-store', signal: AbortSignal.timeout(15000) }); }
  catch (error) { throw new TochkaApiError({ stage: `${stage}:fetch`, code: classifyNetworkError(error) }); }
  onStage?.('HTTP-запрос к Точке', response.status, 'SUCCESS');
  onStage?.('HTTP-ответ получен', response.status);
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { throw new TochkaApiError({ stage: `${stage}:json-parse`, status: response.status, code: 'INVALID_JSON' }); }
  if (!response.ok) throw new TochkaApiError({ stage, status: response.status, code: body?.code || body?.Errors?.[0]?.errorCode, requestId: body?.id });
  return body;
}

export async function discoverCustomerAndMerchant(onStage = null) {
  const customers = await tochka('/open-banking/v1.0/customers', {}, 'get-customers', onStage);
  onStage?.('Проверка структуры Data.Customer');
  const list = customers?.Data?.Customer || customers?.Data?.Customers || customers?.Data || customers?.data?.Customer || customers?.data?.Customers || customers?.data || [];
  const customerList = Array.isArray(list) ? list : [list];
  const customer = customerList.find((item) => item.customerType === 'Business');
  if (!customer?.customerCode) throw new TochkaApiError({ stage: 'get-customers:structure', code: 'INVALID_RESPONSE_STRUCTURE' });
  const retailers = await tochka(`/acquiring/v1.0/retailers?customerCode=${encodeURIComponent(customer.customerCode)}`, {}, 'get-retailers', onStage);
  onStage?.('Проверка структуры Data.Retailer');
  const rawPoints = retailers?.Data?.Retailer || retailers?.Data?.Retailers || retailers?.Data || retailers?.data?.Retailer || retailers?.data?.Retailers || retailers?.data || [];
  const points = Array.isArray(rawPoints) ? rawPoints : [rawPoints];
  const merchant = points.find((item) => item.status === 'REG' && item.isActive === true) || points[0];
  if (!merchant?.merchantId) throw new TochkaApiError({ stage: 'get-retailers:structure', code: 'INVALID_RESPONSE_STRUCTURE' });
  return { customerCode: customer.customerCode, merchantId: merchant.merchantId };
}

export async function createPayment({ customerCode, merchantId, amount, paymentLinkId, email, redirectUrl, failRedirectUrl, onStage = null }) {
  const data = buildPaymentData({ customerCode, merchantId, amount, paymentLinkId, email, redirectUrl, failRedirectUrl });
  const result = await tochka('/acquiring/v1.0/payments_with_receipt', { method: 'POST', body: JSON.stringify({ Data: data }) }, 'create-payment-with-receipt', onStage);
  const operation = result?.Data?.Operation?.[0] || result?.Data || result?.data || result;
  const operationId = operation.operationId || operation.id;
  if (!operationId) throw new TochkaApiError({ stage: 'create-payment-with-receipt:structure', code: 'INVALID_RESPONSE_STRUCTURE' });
  return { operationId, paymentUrl: operation.paymentLink || operation.paymentUrl || operation.url };
}

export function buildPaymentData({ customerCode, merchantId, amount, paymentLinkId, email, redirectUrl, failRedirectUrl }) {
  return { customerCode, amount, purpose: 'Предоставление информации о текущем дне недели', redirectUrl, failRedirectUrl, paymentMode: ['sbp'], paymentLinkId, ttl: 60, taxSystemCode: 'usn_income', merchantId, Client: { name: 'Покупатель', email }, Items: [{ name: 'Предоставление информации о текущем дне недели', vatType: 'none', amount, quantity: 1, paymentMethod: 'full_payment', paymentObject: 'service', measure: 'шт.' }] };
}

export function getPayment(operationId) { return tochka(`/acquiring/v1.0/payments/${encodeURIComponent(operationId)}`); }
