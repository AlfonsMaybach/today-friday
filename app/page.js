'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import DiagnosticPanel from './components/DiagnosticPanel';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function Home() {
  const [phase, setPhase] = useState('idle');
  const [status, setStatus] = useState('Готовы проверить календарную реальность.');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [email, setEmail] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(99);
  const [diagnosticReport, setDiagnosticReport] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const orderId = query.get('payment');
    if (!orderId || orderId === 'failed') return;
    let cancelled = false;
    (async () => {
      try {
        setPhase('processing'); setStatus('Проверяем подтверждение оплаты…');
        for (let attempt = 0; attempt < 30; attempt += 1) {
          const payment = await api(`/api/payment-status?orderId=${encodeURIComponent(orderId)}`);
          if (payment.status === 'paid') {
            const answer = await api(`/api/result?orderId=${encodeURIComponent(orderId)}`);
            if (!cancelled) { setResult(answer); setPhase(answer.isFriday ? 'friday' : 'not-friday'); }
            return;
          }
          if (payment.status === 'failed') throw new Error('Платёж не подтверждён.');
          await sleep(2000);
        }
        throw new Error('Платёж пока не подтверждён.');
      } catch (error) { if (!cancelled) { setStatus(error.message); setPhase('error'); } }
    })();
    return () => { cancelled = true; };
  }, []);

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
      fetch('/api/payment-config').then((response) => response.json()).then((config) => setPaymentAmount(config.actualAmount || 99)).catch(() => {});
      return;
    }
    setPhase('processing');
    setProgress(4);
    setResult(null);

    try {
      setStatus('Формируем защищённый запрос…');
      await advance(4, 18, 420);
      const payment = await api('/api/create-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      if (payment.paymentUrl) { window.location.assign(payment.paymentUrl); return; }
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
    setResult(null);
    setEmailOpen(false);
    setStatus('Готовы проверить календарную реальность.');
    setDiagnosticReport(null);
  }

  const hasResult = phase === 'friday' || phase === 'not-friday';

  return (
    <>
    <main className={`experience desktop-experience phase-${phase}`}>
      <div className="hero-stage">
        <Image className="hero-art" src="/city-storm-v41-shadow-fixed.jpg" alt="Ночной город и грозовое облако" fill priority sizes="100vw" />
        {phase === 'idle' && <><button className="truth-button" onClick={start}><span>Узнать правду</span><b aria-hidden="true">→</b></button>{emailOpen && <form className="email-form" onSubmit={start}><strong>К оплате сейчас: {paymentAmount} ₽</strong><label>Укажите email для электронного чека<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required placeholder="you@example.com" /><button type="submit">Перейти к оплате</button></label><p className="privacy-note">Email нужен только для электронного чека. <a href="/privacy">Политика обработки персональных данных</a>.</p></form>}</>}
      </div>
      <div className="ambient-glow" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <section className="interaction" aria-live="polite">
        <h1 className="sr-only">Сегодня пятница?</h1>
        {phase === 'processing' && <div className="status-card" role="status"><p>{status}</p><div className="progress-label"><span>ПРОВЕРКА</span><b>{progress}%</b></div><div className="progress-track"><i style={{ width: `${progress}%` }} /></div></div>}
        {phase === 'error' && <div className="status-card status-error" role="alert"><p>{status}</p><button className="retry-button" onClick={reset}>Попробовать ещё раз</button></div>}
        {hasResult && <section className={`result-card ${result?.isFriday ? 'is-friday' : ''}`}><p>ОФИЦИАЛЬНЫЙ РЕЗУЛЬТАТ</p><h2>{result?.isFriday ? 'ДА!' : 'НЕТ'}</h2><span>{result?.isFriday ? 'Сегодня действительно пятница.' : 'Сегодня ещё не пятница.'}</span><button className="retry-button" onClick={reset}>Проверить ещё раз · 99 ₽</button></section>}
      </section>
      {phase === 'friday' && <div className="celebration" aria-hidden="true" />}
      <DiagnosticPanel report={diagnosticReport} onClose={() => setDiagnosticReport(null)} />
      <footer className="desktop-footer"><span>ПОТОМУ ЧТО ПЯТНИЦА — ЭТО ВАЖНО.</span><nav aria-label="Юридическая информация"><a href="/privacy">Политика</a><a href="/offer">Оферта</a><a href="/contacts">Контакты</a></nav></footer>
    </main>
    <main className={`mobile-experience phase-${phase}`}>
      <Image className="mobile-art" src="/city-storm-v41-mobile.jpg" alt="Ночной город и грозовое облако" fill priority sizes="100vw" />
      <div className="mobile-vignette" aria-hidden="true" />
      <header className="mobile-nav"><span>TODAY-FRIDAY</span><button type="button" aria-label="Открыть меню"><i /><i /><i /></button></header>
      <section className="mobile-content" aria-live="polite">
        {phase === 'idle' && <><h1>Сегодня<br />пятница?</h1><p>ПОЛУЧИ ТОЧНЫЙ ОТВЕТ<br />ВСЕГО ЗА</p><strong>99 ₽</strong>{emailOpen && <form className="mobile-email-form" onSubmit={start}><b>К оплате сейчас: {paymentAmount} ₽</b><label>Email для электронного чека<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required placeholder="you@example.com" /></label><button type="submit">ПЕРЕЙТИ К ОПЛАТЕ</button><p className="privacy-note">Email нужен только для электронного чека. <a href="/privacy">Политика обработки персональных данных</a>.</p></form>}{!emailOpen && <button className="mobile-truth-button" onClick={start}>УЗНАТЬ ПРАВДУ <b aria-hidden="true">→</b></button>}<small>▣&nbsp; Безопасная оплата</small></>}
        {phase === 'processing' && <div className="mobile-status" role="status"><p>{status}</p><div><span>ПРОВЕРКА</span><b>{progress}%</b></div><i><em style={{ width: `${progress}%` }} /></i></div>}
        {phase === 'error' && <div className="mobile-status mobile-status-error" role="alert"><p>{status}</p><button className="mobile-retry" onClick={reset}>Попробовать ещё раз</button></div>}
        {hasResult && <><h1 className="mobile-result-heading">Сегодня<br />пятница?</h1><section className={`mobile-result ${result?.isFriday ? 'is-friday' : ''}`}><p>ОФИЦИАЛЬНЫЙ РЕЗУЛЬТАТ</p><h2>{result?.isFriday ? 'ДА!' : 'НЕТ'}</h2><span>{result?.isFriday ? 'Сегодня действительно пятница.' : 'Сегодня ещё не пятница.'}</span><button className="mobile-retry" onClick={reset}>Проверить ещё раз · 99 ₽</button></section></>}
      </section>
      {phase === 'idle' && <section className="mobile-benefits" aria-label="Преимущества"><article><b>◌</b><span><strong>100% ТОЧНОСТЬ</strong><small>Проверяем по реальному времени</small></span></article><article><b>▣</b><span><strong>БЕЗОПАСНАЯ ОПЛАТА</strong><small>Платежи защищены</small></span></article><article><b>ϟ</b><span><strong>МОМЕНТАЛЬНЫЙ ОТВЕТ</strong><small>Сразу после оплаты</small></span></article></section>}
      <footer className="mobile-footer"><span>ПОТОМУ ЧТО ПЯТНИЦА — ЭТО ВАЖНО.</span><nav aria-label="Юридическая информация"><a href="/privacy">Политика</a><a href="/offer">Оферта</a><a href="/contacts">Контакты</a></nav></footer>
      {phase === 'friday' && <div className="celebration" aria-hidden="true" />}
    </main>
    </>
  );
}
