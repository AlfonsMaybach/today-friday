'use client';

import { useState } from 'react';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function Home() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Ответ откроется только после подтверждения оплаты.');
  const [result, setResult] = useState(null);
  const [disperse, setDisperse] = useState(false);
  const [pieces, setPieces] = useState([]);

  async function api(url, options) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Ошибка сервера');
    return data;
  }

  async function start() {
    setBusy(true);
    setStatus('Создаём платёж…');

    try {
      const payment = await api('/api/create-payment', { method: 'POST' });

      if (payment.paymentUrl) {
        window.location.assign(payment.paymentUrl);
        return;
      }

      setStatus('Ждём подтверждение платежа…');

      let paid = payment.status === 'paid';
      for (let i = 0; !paid && i < 30; i++) {
        await sleep(2000);
        const current = await api('/api/payment-status?token=' + encodeURIComponent(payment.token));
        paid = current.status === 'paid';
      }

      if (!paid) throw new Error('Платёж пока не подтверждён.');

      const answer = await api('/api/result?token=' + encodeURIComponent(payment.token));
      setDisperse(true);
      await sleep(650);
      setResult(answer);
      setStatus('');

      if (answer.isFriday) celebrate();
    } catch (e) {
      setStatus(e.message);
      setBusy(false);
    }
  }

  function celebrate() {
    if (navigator.vibrate) navigator.vibrate([100, 60, 140]);
    const items = Array.from({ length: 140 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * .6,
      duration: 1.5 + Math.random() * 1.7,
      rotate: Math.random() * 360,
      hue: Math.floor(Math.random() * 360)
    }));
    setPieces(items);
    setTimeout(() => setPieces([]), 4000);
  }

  function reset() {
    setResult(null);
    setDisperse(false);
    setBusy(false);
    setStatus('Ответ откроется только после подтверждения оплаты.');
  }

  return (
    <main className={result?.isFriday ? 'app party' : 'app'}>
      <div className="confetti" aria-hidden="true">
        {pieces.map(p => (
          <i key={p.id} style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
            background: `hsl(${p.hue} 90% 55%)`
          }} />
        ))}
      </div>

      <section className="card">
        <div className="eyebrow">СЕРВИС АБСОЛЮТНОЙ ВАЖНОСТИ</div>
        <h1>СЕГОДНЯ<br />ПЯТНИЦА?</h1>
        <p className="subtitle">Мы не гарантируем, что вам понравится ответ.</p>

        <div className="oracle">
          {!result && <div className={`cloud ${disperse ? 'disperse' : ''}`}>?</div>}
        </div>

        {!result ? (
          <div>
            <div className="price">99 ₽ <span>за правду</span></div>
            <button className="primary" disabled={busy} onClick={start}>
              {busy ? 'ПРОВЕРЯЕМ…' : 'УЗНАТЬ ПРАВДУ'}
            </button>
            <p className="finePrint">{status}</p>
          </div>
        ) : (
          <section className={`result ${result.isFriday ? 'friday' : 'no'}`} aria-live="polite">
            <div className="answer">{result.isFriday ? 'ДА! 🎉' : 'НЕТ 😔'}</div>
            <p>{result.isFriday ? 'С ПЯТНИЦЕЙ!' : 'Мы тоже разочарованы.'}</p>
            <button className="secondary" onClick={reset}>ПРОВЕРИТЬ ЕЩЁ РАЗ — 99 ₽</button>
          </section>
        )}
      </section>
    </main>
  );
}
