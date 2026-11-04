'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function Home() {
  const [phase, setPhase] = useState('idle');
  const [status, setStatus] = useState('Готовы проверить календарную реальность.');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  async function api(url, options) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Не удалось получить ответ сервера.');
    return data;
  }

  async function advance(from, to, duration) {
    const steps = 18;
    for (let step = 1; step <= steps; step += 1) {
      setProgress(Math.round(from + ((to - from) * step) / steps));
      await sleep(duration / steps);
    }
  }

  async function start() {
    if (phase === 'processing') return;
    setPhase('processing');
    setProgress(4);
    setResult(null);

    try {
      setStatus('Формируем защищённый запрос…');
      await advance(4, 18, 420);
      const payment = await api('/api/create-payment', { method: 'POST' });
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
      setStatus(error.message || 'Что-то пошло не так.');
      setPhase('error');
    }
  }

  function reset() {
    setPhase('idle');
    setProgress(0);
    setResult(null);
    setStatus('Готовы проверить календарную реальность.');
  }

  const hasResult = phase === 'friday' || phase === 'not-friday';

  return (
    <main className={`experience phase-${phase}`}>
      <Image className="hero-art" src="/city-storm-v41.png" alt="Ночной город и грозовое облако" fill priority sizes="100vw" />
      <div className="ambient-glow" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <section className="interaction" aria-live="polite">
        <h1 className="sr-only">Сегодня пятница?</h1>
        {phase === 'idle' && <button className="truth-button" onClick={start}><span>Узнать правду</span><b aria-hidden="true">→</b></button>}
        {phase === 'processing' && <div className="status-card" role="status"><p>{status}</p><div className="progress-label"><span>ПРОВЕРКА</span><b>{progress}%</b></div><div className="progress-track"><i style={{ width: `${progress}%` }} /></div></div>}
        {phase === 'error' && <div className="status-card status-error" role="alert"><p>{status}</p><button className="retry-button" onClick={reset}>Попробовать ещё раз</button></div>}
        {hasResult && <section className={`result-card ${result?.isFriday ? 'is-friday' : ''}`}><p>ОФИЦИАЛЬНЫЙ РЕЗУЛЬТАТ</p><h2>{result?.isFriday ? 'ДА!' : 'НЕТ'}</h2><span>{result?.isFriday ? 'Сегодня действительно пятница.' : 'Сегодня ещё не пятница.'}</span><button className="retry-button" onClick={reset}>Проверить ещё раз · 99 ₽</button></section>}
      </section>
      {phase === 'friday' && <div className="celebration" aria-hidden="true" />}
    </main>
  );
}
