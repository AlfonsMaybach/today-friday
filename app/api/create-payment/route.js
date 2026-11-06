import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { createPaymentToken } from '../../../lib/payment-token';
import { checkoutConfiguration } from '../../../lib/checkout-configuration';
import { createOrder, updateOrder, consumeRateLimit } from '../../../lib/db';
import { createPayment, discoverCustomerAndMerchant, TochkaApiError } from '../../../lib/tochka';
import { diagnosticsEnabled, createDiagnostics, startStage, safeDiagnosticError, markProviderFailure } from '../../../lib/payment-diagnostics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const checkoutConfig = checkoutConfiguration();
  if (!checkoutConfig.ready) {
    console.error('production_checkout_not_configured');
    return NextResponse.json({ error: 'Оплата временно недоступна.' }, { status: 503 });
  }
  const diagnostics = diagnosticsEnabled() ? createDiagnostics() : null;
  const stage = (name) => diagnostics ? startStage(diagnostics, name) : null;
  const finish = (handle, details) => handle?.finish(details);
  const received = stage('Получение запроса create-payment'); finish(received);
  const rateKey = request.cookies.get('tf_rate_key')?.value || crypto.randomUUID();
  const setRateCookie = (response) => { response.cookies.set('tf_rate_key', rateKey, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 86400, path: '/' }); return response; };
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return setRateCookie(NextResponse.json({ error: 'Недопустимый источник запроса.' }, { status: 403 }));
  const allowed = await consumeRateLimit(`create:${rateKey}`, 3, 300);
  if (!allowed) return setRateCookie(NextResponse.json({ error: 'Слишком много запросов. Попробуйте позже.' }, { status: 429 }));
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const input = stage('Проверка входных данных');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { finish(input, { result: 'FAILED', errorCode: 'INVALID_EMAIL' }); return setRateCookie(NextResponse.json({ error: 'Укажите корректный email для электронного чека.' }, { status: 400 })); }
  finish(input);
  const provider = process.env.PAYMENT_PROVIDER || 'stub';

  if (provider === 'tochka') {
    const id = crypto.randomUUID();
    const { amountKopecks, displayAmountKopecks } = checkoutConfig;
    const paymentLinkId = `tf-${id}`;
    const accessToken = createPaymentToken({ id, type: 'order-access', createdAt: Date.now(), expiresAt: Date.now() + 60 * 60 * 1000 });
    const orderStage = stage('Создание заказа в Neon');
    await createOrder({ id, amountKopecks, displayAmountKopecks, paymentLinkId }); finish(orderStage);
    let providerCallStarted = false;
    try {
      const activeProviderStages = new Map();
      const providerStage = (name, httpStatus = null, result = 'SUCCESS') => {
        if (result === 'START') { activeProviderStages.set(name, stage(name)); return; }
        const handle = activeProviderStages.get(name) || stage(name);
        finish(handle, { httpStatus, result });
        if (result !== 'RUNNING') activeProviderStages.delete(name);
      };
      const { customerCode, merchantId } = await discoverCustomerAndMerchant((name, httpStatus, result) => providerStage(name, httpStatus, result));
      const origin = new URL(request.url).origin;
      providerCallStarted = true;
      const paymentStage = stage('POST payments_with_receipt');
      const payment = await createPayment({ customerCode, merchantId, amount: amountKopecks / 100, paymentLinkId, email, redirectUrl: `${origin}/?payment=${id}`, failRedirectUrl: `${origin}/?payment=failed`, onStage: (name, httpStatus, result) => providerStage(name, httpStatus, result) });
      finish(paymentStage); const parseStage = stage('Разбор ответа банка'); finish(parseStage); if (diagnostics) diagnostics.providerRequestId = null;
      const saveStage = stage('Сохранение банковской операции');
      await updateOrder(id, { provider_operation_id: payment.operationId, payment_url: payment.paymentUrl, customer_code: customerCode, merchant_id: merchantId, status: 'pending' }); finish(saveStage);
      const returnStage = stage('Возврат ссылки на оплату'); finish(returnStage);
      const response = NextResponse.json({ provider: 'tochka', orderId: id, status: 'pending', actualAmount: amountKopecks / 100, displayAmount: displayAmountKopecks / 100, paymentUrl: payment.paymentUrl });
      response.cookies.set('tf_order_access', accessToken, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 3600, path: '/' });
      response.cookies.set('tf_rate_key', rateKey, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 86400, path: '/' });
      return setRateCookie(response);
    } catch (error) {
      const requestId = error instanceof TochkaApiError ? error.requestId : null;
      const diagnostic = { stage: error instanceof TochkaApiError ? error.stage : providerCallStarted ? 'create-payment' : 'discover-customer-merchant', status: error instanceof TochkaApiError ? error.status : 0, code: error instanceof TochkaApiError ? error.code : 'INTEGRATION_ERROR', requestId };
      console.error('payment_creation_failed', diagnostic);
      if (diagnostics) { diagnostics.providerRequestId = requestId; markProviderFailure(diagnostics, error); }
      await updateOrder(id, { status: providerCallStarted ? 'pending' : 'failed' });
      const response = NextResponse.json({ error: 'Не удалось создать платёж.', requestId: requestId || id.slice(0, 8), ...(diagnostics ? { diagnostics } : {}) }, { status: 502 });
      return setRateCookie(response);
    }
  }

  if (provider !== 'stub') {
    return setRateCookie(NextResponse.json(
      { error: 'Реальный платёжный провайдер ещё не подключён.' },
      { status: 501 }
    ));
  }

  // Test-only mode. Replace with provider-confirmed payment status before accepting money.
  const status = process.env.PAYMENT_TEST_MODE === 'true' ? 'paid' : 'pending';
  const createdAt = Date.now();

  const payload = {
    id: crypto.randomUUID(),
    status,
    amount: Number(process.env.PAYMENT_AMOUNT || 99),
    currency: process.env.PAYMENT_CURRENCY || 'RUB',
    createdAt,
    expiresAt: createdAt + 15 * 60 * 1000
  };

  return setRateCookie(NextResponse.json({
    token: createPaymentToken(payload),
    status,
    amount: payload.amount,
    currency: payload.currency,
    paymentUrl: null,
    displayAmount: 99
  }));
}
