'use client';

import qrcode from 'qrcode-generator';
import { useEffect, useRef, useState } from 'react';
import DiagnosticPanel from './components/DiagnosticPanel';
import './v5.css';
import './v5-approved.css';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function paymentQrDataUrl(paymentUrl) {
  const qr = qrcode(0, 'M');
  qr.addData(paymentUrl);
  qr.make();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr.createSvgTag({ cellSize: 5, margin: 4 }))}`;
}

function FeatureIcon({ name }) {
  if (name === 'shield') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 20 5v6c0 5.4-3.4 8.8-8 11-4.6-2.2-8-5.6-8-11V5l8-3Z" /></svg>;
  if (name === 'card') return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h4" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z" /></svg>;
}
function Features() {
  return <section className="v5-features" aria-label="Преимущества">
    <article><FeatureIcon name="shield" /><strong>100% ТОЧНОСТЬ</strong><span>Проверяем<br />по реальному времени</span></article>
    <article><FeatureIcon name="card" /><strong>БЕЗОПАСНАЯ ОПЛАТА</strong><span>Платежи защищены</span></article>
    <article><FeatureIcon name="flash" /><strong>МОМЕНТАЛЬНЫЙ ОТВЕТ</strong><span>Сразу после оплаты</span></article>
  </section>;
}

export default function Home() {
  const [phase, setPhase] = useState('idle');
  const [status, setStatus] = useState('Готовы проверить календарную реальность.');
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState('verification');
  const [result, setResult] = useState(null);
  const [email, setEmail] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(50);
  const [checkout, setCheckout] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [diagnosticReport, setDiagnosticReport] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);
  useEffect(() => {
    fetch('/api/payment-config').then((response) => response.json()).then((config) => {
      if (Number.isFinite(config.actualAmount) && config.actualAmount > 0) setPaymentAmount(config.actualAmount);
    }).catch(() => {});
  }, []);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const orderId = query.get('payment');
    if (!orderId || orderId === 'failed') return;
    let cancelled = false;
    (async () => {
      try {
        setProgressStage('verification'); setPhase('processing'); setStatus('Проверяем подтверждение оплаты…'); setProgress(8);
        for (let attempt = 0; attempt < 30; attempt += 1) {
          if (!cancelled) setProgress(Math.min(92, 8 + (attempt * 3)));
          const payment = await api(`/api/payment-status?orderId=${encodeURIComponent(orderId)}`);
          if (payment.status === 'paid') {
            if (!cancelled) setProgress(96);
            const answer = await api(`/api/result?orderId=${encodeURIComponent(orderId)}`);
            if (!cancelled) { setProgress(100); setResult(answer); setPhase(answer.isFriday ? 'friday' : 'not-friday'); }
            return;
          }
          if (payment.status === 'failed') throw new Error('Платёж не подтверждён.');
          await sleep(2000);
        }
        throw new Error('Платёж пока не подтверждён.');
      } catch (error) { if (!cancelled) { setStatus(error.message === 'Платёж не найден.' ? 'Доступ к заказу на этом устройстве отсутствует. Если вы сканировали QR с телефона, результат появится на устройстве, где начинали оплату.' : error.message); setPhase('error'); } }
    })();
    return () => { cancelled = true; };
  }, []);

  // The original order stays bound to the httpOnly cookie while QR checkout is open.
  // Poll only our server; never treat a QR scan or a browser redirect as proof of payment.
  useEffect(() => {
    if (!checkout?.orderId || phase !== 'processing') return;
    let active = true;
    let timer;
    let attempts = 0;
    const poll = async () => {
      if (!active) return;
      try {
        const payment = await api(`/api/payment-status?orderId=${encodeURIComponent(checkout.orderId)}`);
        if (payment.status === 'paid') {
          const answer = await api(`/api/result?orderId=${encodeURIComponent(checkout.orderId)}`);
          if (active) {
            setCheckoutOpen(false);
            setProgressStage('verification');
            setProgress(100);
            setResult(answer);
            setPhase(answer.isFriday ? 'friday' : 'not-friday');
          }
          return;
        }
        if (payment.status === 'failed') {
          if (active) {
            setCheckoutOpen(false);
            setCheckout(null);
            setStatus('Банк не подтвердил платёж. Можно попробовать ещё раз.');
            setPhase('error');
          }
          return;
        }
      } catch {
        // Network hiccups should not create a new payment or discard the existing order.
      }
      attempts += 1;
      if (attempts >= 120) {
        if (active) {
          setCheckoutOpen(false);
          setStatus('Платёж пока не подтверждён. Нажмите «Проверить оплату» для повторной проверки.');
          setPhase('error');
        }
        return;
      }
      timer = setTimeout(poll, 2000);
    };
    poll();
    return () => { active = false; clearTimeout(timer); };
  }, [checkout?.orderId, phase]);

  async function api(url, options) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { const error = new Error(data.error || 'Не удалось получить ответ сервера.'); error.diagnostics = data.diagnostics; throw error; }
    return data;
  }

  async function advance(from, to, duration) {
    const steps = 18;
    for (let step = 1; step <= steps; step += 1) {
      setProgress(Math.round(from + ((to - from) * step) / steps));
      await sleep(duration / steps);
    }
  }

  async function start(event) {
    event?.preventDefault();
    if (phase === 'processing') return;
    if (!emailOpen) {
      setEmailOpen(true);
      fetch('/api/payment-config').then((response) => response.json()).then((config) => setPaymentAmount(config.actualAmount || 50)).catch(() => {});
      return;
    }
    setProgressStage('preparation');
    setPhase('processing');
    setProgress(4);
    setResult(null);

    try {
      setStatus('Формируем защищённый запрос…');
      await advance(4, 18, 420);
      const payment = await api('/api/create-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      if (payment.paymentUrl) {
        setStatus('Платёж подготовлен. Открываем варианты оплаты…');
        await advance(18, 100, 720);
        const url = new URL(payment.paymentUrl);
        if (url.protocol !== 'https:') throw new Error('Недопустимая ссылка на оплату.');
        setCheckout({ orderId: payment.orderId, paymentUrl: url.href, qrSrc: paymentQrDataUrl(url.href), amount: payment.actualAmount });
        setCheckoutOpen(true);
        setProgressStage('payment');
        setStatus('Ожидаем подтверждения оплаты от банка…');
        return;
      }
      setProgressStage('verification');
      setStatus('Проверяем подтверждение оплаты…');
      await advance(18, 46, 560);

      let paid = payment.status === 'paid';
      for (let attempt = 0; !paid && attempt < 12; attempt += 1) {
        await sleep(1000);
        const currentPayment = await api(`/api/payment-status?token=${encodeURIComponent(payment.token)}`);
        paid = currentPayment.status === 'paid';
      }
      if (!paid) throw new Error('Тестовый платёж пока не подтверждён. Попробуйте ещё раз.');

      setStatus('Синхронизируемся с календарной реальностью…');
      await advance(46, 72, 680);
      setStatus('Определяем текущий день недели…');
      await advance(72, 94, 720);
      const answer = await api(`/api/result?token=${encodeURIComponent(payment.token)}`);
      setStatus('Истина установлена.');
      await advance(94, 100, 300);
      setResult(answer);
      setPhase(answer.isFriday ? 'friday' : 'not-friday');
    } catch (error) {
      if (error.diagnostics) setDiagnosticReport(error.diagnostics);
      setStatus(error.message || 'Что-то пошло не так.');
      setPhase('error');
    }
  }

  function reset() {
    setPhase('idle');
    setProgress(0);
    setProgressStage('verification');
    setResult(null);
    setEmailOpen(false);
    setCheckout(null);
    setCheckoutOpen(false);
    setStatus('Готовы проверить календарную реальность.');
    setDiagnosticReport(null);
  }

  const hasResult = phase === 'friday' || phase === 'not-friday';

  return (
    <main className={`v5-shell v5-approved v5-phase-${phase}`}>
      <div className="v5-approved-frame">
        {hasResult ? (
          <div className={`v5-approved-result-art ${result?.isFriday ? 'v5-yes-art' : 'v5-no-art'}`} role="img" aria-label={result?.isFriday ? 'Официальный результат: ДА! Сегодня действительно пятница.' : 'Официальный результат: НЕТ! Сегодня не пятница.'}>
            <button type="button" className="v5-approved-retry" onClick={reset} aria-label="Проверить ещё раз">Проверить ещё раз · {paymentAmount} ₽</button>
            <nav className="v5-art-legal" aria-label="Юридическая информация">
              <a href="/privacy" aria-label="Политика конфиденциальности" /><a href="/offer" aria-label="Оферта" /><a href="/contacts" aria-label="Контакты" />
            </nav>
          </div>
        ) : (
          <>
            <div className="v5-approved-desktop">
              <img src="/v5-approved-landing-70.png" alt="Сегодня пятница? Узнай прямо сейчас и получи ответ за 50 рублей. Скидка с 99 до 50 рублей. 100% точность, безопасная оплата, моментальный ответ." className="v5-approved-art" />
              {phase === 'idle' && <button type="button" className="v5-art-start" onClick={start} aria-label="Узнать сейчас, 50 рублей" />}
              <nav className="v5-art-legal" aria-label="Юридическая информация">
                <a href="/privacy" aria-label="Политика конфиденциальности" /><a href="/offer" aria-label="Оферта" /><a href="/contacts" aria-label="Контакты" />
              </nav>
            </div>
            <div className="v5-approved-mobile">
              <h1 className="v5-heading">Сегодня<br />пятница?</h1>
              {phase === 'idle' && <>
                <p className="v5-subheading">Узнай прямо сейчас<br />и получи ответ за {paymentAmount} рублей</p>
                <div className="v5-prices"><del className="v5-old-price">99 ₽</del><strong className="v5-new-price">{paymentAmount} ₽</strong></div>
                <button type="button" className="v5-gold-button" onClick={start}>Узнать сейчас</button>
              </>}
              {phase === 'processing' && <section className="v5-status" role="status"><span className="v5-kicker">ОЖИДАНИЕ ПОДТВЕРЖДЕНИЯ</span><p>{status}</p><div className="v5-progress"><i style={{width:`${progress}%`}} /></div><small>{progressStage === 'payment' ? 'Результат появится после подтверждения банка' : `${progress}%`}</small>{checkout && !checkoutOpen && <button type="button" className="v5-secondary-button" onClick={() => setCheckoutOpen(true)}>Показать оплату</button>}</section>}
              {phase === 'error' && <section className="v5-status" role="alert"><p>{status}</p><button type="button" className="v5-secondary-button" onClick={checkout ? () => {setCheckoutOpen(true);setPhase('processing');} : reset}>Повторить</button></section>}
              <Features />
              <nav className="v5-legal" aria-label="Юридическая информация"><a href="/privacy">Политика конфиденциальности</a><span>|</span><a href="/offer">Оферта</a><span>|</span><a href="/contacts">Контакты</a></nav>
            </div>
            {phase !== 'idle' && <div className="v5-approved-desktop-status">
              <section className="v5-status" role={phase === 'error' ? 'alert' : 'status'}>
                <span className="v5-kicker">{phase === 'error' ? 'ПРОВЕРКА НЕ ЗАВЕРШЕНА' : 'ОЖИДАНИЕ ПОДТВЕРЖДЕНИЯ'}</span>
                <p>{status}</p>
                {phase === 'processing' && <><div className="v5-progress"><i style={{width:`${progress}%`}} /></div><small>{progressStage === 'payment' ? 'Результат появится после подтверждения банка' : `${progress}%`}</small></>}
                {checkout && !checkoutOpen && <button type="button" className="v5-secondary-button" onClick={() => {setCheckoutOpen(true);setPhase('processing');}}>Показать QR-код</button>}
                {phase === 'error' && !checkout && <button type="button" className="v5-secondary-button" onClick={reset}>Попробовать ещё раз</button>}
              </section>
            </div>}
          </>
        )}
      </div>
      {emailOpen && phase === 'idle' && <div className="v5-overlay" role="presentation">
        <form className="v5-modal v5-email-modal" onSubmit={start} aria-label="Электронный чек">
          <button className="v5-close" type="button" onClick={() => setEmailOpen(false)} aria-label="Закрыть">×</button>
          <span className="v5-kicker">TODAY FRIDAY · ЭЛЕКТРОННЫЙ ЧЕК</span>
          <h2>Почти готово</h2>
          <p>Укажите email, на который придёт электронный чек.</p>
          <label htmlFor="v5-email">Электронная почта</label>
          <input id="v5-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" autoFocus required placeholder="you@example.com" />
          <button className="v5-gold-button v5-modal-button" type="submit">Перейти к оплате · {paymentAmount} ₽</button>
          <small>Email используется для оформления чека. <a href="/privacy">Политика конфиденциальности</a>.</small>
        </form>
      </div>}
      {checkout && checkoutOpen && <div className="v5-overlay" role="presentation">
        <section className="v5-modal v5-qr-modal" role="dialog" aria-modal="true" aria-label="Оплата через Точку">
          <button className="v5-close" type="button" onClick={() => setCheckoutOpen(false)} aria-label="Свернуть оплату">×</button>
          <span className="v5-kicker">TODAY FRIDAY · БЕЗОПАСНАЯ ОПЛАТА</span>
          <h2>Оплата <strong>{checkout.amount} ₽</strong></h2>
          <p>Сканируйте QR-код камерой телефона, чтобы открыть страницу оплаты Точки.</p>
          <div className="v5-qr-frame"><img src={checkout.qrSrc} alt="QR-код ссылки на страницу оплаты Точки" width="230" height="230" /></div>
          <p className="v5-qr-note">QR ведёт на защищённую страницу Точки. Это не прямой код СБП.</p>
          <a className="v5-gold-button v5-modal-button" href={checkout.paymentUrl} target="_blank" rel="noopener noreferrer">Открыть оплату в Точке</a>
          <small>После подтверждения оплаты результат появится здесь автоматически.</small>
        </section>
      </div>}
      <DiagnosticPanel report={diagnosticReport} onClose={() => setDiagnosticReport(null)} />
    </main>
  );
}
