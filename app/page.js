'use client';

import { useEffect, useRef, useState } from 'react';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export default function Home() {
  const [phase, setPhase] = useState('idle');
  const [status, setStatus] = useState('Система готова к проведению проверки.');
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [confetti, setConfetti] = useState([]);
  const audioRef = useRef(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.close?.();
    };
  }, []);

  async function api(url, options) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Ошибка сервера');
    return data;
  }

  async function dramaticProgress(from, to, ms) {
    const steps = 20;
    for (let i = 1; i <= steps; i++) {
      setProgress(Math.round(from + (to - from) * (i / steps)));
      await sleep(ms / steps);
    }
  }

  async function start() {
    setPhase('processing');
    setResult(null);
    setProgress(3);
    setStatus('Формируем защищённый запрос…');

    try {
      await dramaticProgress(3, 18, 450);
      const payment = await api('/api/create-payment', { method: 'POST' });

      setStatus('Проверяем подтверждение оплаты…');
      await dramaticProgress(18, 38, 650);

      let paid = payment.status === 'paid';
      for (let i = 0; !paid && i < 30; i++) {
        await sleep(2000);
        const current = await api('/api/payment-status?token=' + encodeURIComponent(payment.token));
        paid = current.status === 'paid';
      }
      if (!paid) throw new Error('Платёж пока не подтверждён.');

      setStatus('Синхронизируемся с календарной реальностью…');
      await dramaticProgress(38, 67, 800);
      setStatus('Определяем текущий день недели…');
      await dramaticProgress(67, 91, 900);

      const answer = await api('/api/result?token=' + encodeURIComponent(payment.token));

      setStatus('Истина установлена.');
      await dramaticProgress(91, 100, 450);
      await sleep(500);

      setPhase('reveal');
      await sleep(950);
      setResult(answer);
      setPhase(answer.isFriday ? 'friday' : 'no');

      if (answer.isFriday) celebrate();
    } catch (e) {
      setStatus(e.message);
      setPhase('error');
    }
  }

  function celebrate() {
    if (navigator.vibrate) navigator.vibrate([120, 50, 180, 50, 260]);
    setConfetti(Array.from({ length: 220 }, (_, id) => ({
      id,
      left: Math.random() * 100,
      delay: Math.random() * 1.1,
      duration: 1.8 + Math.random() * 2.4,
      size: 5 + Math.random() * 9,
      hue: Math.floor(Math.random() * 360),
      drift: (Math.random() - .5) * 260
    })));
    if (soundOn) playCelebration();
    setTimeout(() => setConfetti([]), 5200);
  }

  function playCelebration() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      audioRef.current = ctx;
      const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i % 2 ? 'triangle' : 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * .12);
        gain.gain.exponentialRampToValueAtTime(.12, ctx.currentTime + i * .12 + .02);
        gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + i * .12 + .22);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + i * .12);
        osc.stop(ctx.currentTime + i * .12 + .25);
      });
    } catch {}
  }

  function reset() {
    setPhase('idle');
    setResult(null);
    setProgress(0);
    setStatus('Система готова к проведению проверки.');
  }

  const processing = phase === 'processing';
  const revealing = phase === 'reveal';
  const finished = phase === 'friday' || phase === 'no';

  return (
    <main className={`app phase-${phase}`}>
      <div className="noise" />
      <div className="ambient ambientOne" />
      <div className="ambient ambientTwo" />

      <div className="confetti" aria-hidden="true">
        {confetti.map(p => (
          <i key={p.id} style={{
            '--left': `${p.left}%`,
            '--delay': `${p.delay}s`,
            '--duration': `${p.duration}s`,
            '--size': `${p.size}px`,
            '--hue': p.hue,
            '--drift': `${p.drift}px`
          }} />
        ))}
      </div>

      {phase === 'friday' && <div className="fireworks" aria-hidden="true">
        <b className="fw fw1">✦</b><b className="fw fw2">✦</b><b className="fw fw3">✦</b>
      </div>}

      <header className="topbar">
        <div className="brand"><span className="brandMark">ПТ</span><span>ФЕДЕРАЛЬНАЯ СЛУЖБА<br/>ОПРЕДЕЛЕНИЯ ПЯТНИЦЫ</span></div>
        <button className="sound" onClick={() => setSoundOn(v => !v)} aria-label="Переключить звук">
          {soundOn ? 'ЗВУК: ВКЛ' : 'ЗВУК: ВЫКЛ'}
        </button>
      </header>

      <section className="hero">
        <div className="classification">ПРОВЕРКА № 05 · УРОВЕНЬ ДОСТУПА: ОБЫЧНЫЙ ЧЕЛОВЕК</div>
        <h1>СЕГОДНЯ<br/><em>ПЯТНИЦА?</em></h1>
        <p className="lead">Есть вопросы, на которые нельзя отвечать бесплатно.</p>

        <div className={`oracle ${revealing ? 'revealing' : ''} ${finished ? 'finished' : ''}`}>
          {!finished && (
            <>
              <div className="cloud cloudA" />
              <div className="cloud cloudB" />
              <div className="cloud cloudC" />
              <div className="question">?</div>
            </>
          )}
          {finished && (
            <div className="truth">
              <div className="truthLabel">ОФИЦИАЛЬНЫЙ РЕЗУЛЬТАТ</div>
              <div className="answer">{result?.isFriday ? 'ДА!' : 'НЕТ.'}</div>
              <div className="verdict">
                {result?.isFriday ? 'ДАААА! ЭТО ПЯТНИЦА!' : 'Мы тоже разочарованы.'}
              </div>
            </div>
          )}
        </div>

        {processing && (
          <div className="processing">
            <div className="statusRow"><span>{status}</span><strong>{progress}%</strong></div>
            <div className="progress"><i style={{ width: `${progress}%` }} /></div>
            <div className="scan">АНАЛИЗ КАЛЕНДАРНОЙ ОБСТАНОВКИ</div>
          </div>
        )}

        {phase === 'idle' && (
          <div className="purchase">
            <div className="priceBlock"><span className="price">99 ₽</span><span className="priceText">ЕДИНОРАЗОВЫЙ ДОСТУП<br/>К ОБЪЕКТИВНОЙ РЕАЛЬНОСТИ</span></div>
            <button className="primary" onClick={start}><span>УЗНАТЬ ПРАВДУ</span><b>→</b></button>
            <p className="micro">Оплата подтверждается сервером · Ответ формируется в реальном времени</p>
          </div>
        )}

        {phase === 'error' && (
          <div className="purchase">
            <p className="error">{status}</p>
            <button className="primary" onClick={reset}><span>ПОВТОРИТЬ ПРОВЕРКУ</span><b>↻</b></button>
          </div>
        )}

        {finished && (
          <div className="purchase resultActions">
            <button className="primary" onClick={reset}><span>ПРОВЕРИТЬ ЕЩЁ РАЗ · 99 ₽</span><b>↻</b></button>
            <p className="micro">Точность определения пятницы: 100%*</p>
          </div>
        )}
      </section>

      <footer>
        <span>© 2026 ПТ</span>
        <span>*при условии исправной работы пространства-времени</span>
        <span>99 ₽ ЗА ПРАВДУ</span>
      </footer>
    </main>
  );
}
