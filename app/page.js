'use client';

import { useEffect, useRef, useState } from 'react';

const sleep = ms => new Promise(r => setTimeout(r, ms));

export default function Home() {
  const [phase,setPhase] = useState('idle');
  const [status,setStatus] = useState('Готовы проверить календарную реальность.');
  const [progress,setProgress] = useState(0);
  const [result,setResult] = useState(null);
  const [sound,setSound] = useState(true);
  const [confetti,setConfetti] = useState([]);
  const audioRef = useRef(null);

  useEffect(()=>()=>audioRef.current?.close?.(),[]);

  async function api(url, options) {
    const r = await fetch(url, options);
    const data = await r.json().catch(()=>({}));
    if (!r.ok) throw new Error(data.error || 'Ошибка сервера');
    return data;
  }

  async function advance(from,to,ms) {
    const n=18;
    for(let i=1;i<=n;i++){ setProgress(Math.round(from+(to-from)*i/n)); await sleep(ms/n); }
  }

  async function start() {
    setPhase('processing'); setProgress(4); setResult(null);
    try {
      setStatus('Формируем защищённый запрос…'); await advance(4,18,450);
      const payment = await api('/api/create-payment',{method:'POST'});
      setStatus('Проверяем подтверждение оплаты…'); await advance(18,40,600);
      let paid = payment.status === 'paid';
      for(let i=0;!paid && i<30;i++){
        await sleep(2000);
        const p=await api('/api/payment-status?token='+encodeURIComponent(payment.token));
        paid=p.status==='paid';
      }
      if(!paid) throw new Error('Платёж пока не подтверждён.');
      setStatus('Синхронизируемся с календарной реальностью…'); await advance(40,68,800);
      setStatus('Определяем текущий день недели…'); await advance(68,92,850);
      const answer=await api('/api/result?token='+encodeURIComponent(payment.token));
      setStatus('Истина установлена.'); await advance(92,100,400);
      setPhase('reveal'); await sleep(1000);
      setResult(answer); setPhase(answer.isFriday?'friday':'no');
      if(answer.isFriday) celebrate();
    } catch(e) { setStatus(e.message); setPhase('error'); }
  }

  function celebrate(){
    if(navigator.vibrate) navigator.vibrate([120,50,180,50,260]);
    setConfetti(Array.from({length:180},(_,id)=>({
      id,left:Math.random()*100,delay:Math.random(),
      duration:1.8+Math.random()*2.4,hue:Math.random()*360,
      drift:(Math.random()-.5)*260,size:5+Math.random()*8
    })));
    if(sound) playChime();
    setTimeout(()=>setConfetti([]),5000);
  }

  function playChime(){
    try{
      const AC=window.AudioContext||window.webkitAudioContext,ctx=new AC();audioRef.current=ctx;
      [523.25,659.25,783.99,1046.5].forEach((f,i)=>{
        const o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.value=f;
        g.gain.setValueAtTime(.0001,ctx.currentTime+i*.13);
        g.gain.exponentialRampToValueAtTime(.1,ctx.currentTime+i*.13+.02);
        g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+i*.13+.28);
        o.connect(g).connect(ctx.destination);o.start(ctx.currentTime+i*.13);o.stop(ctx.currentTime+i*.13+.3);
      });
    }catch{}
  }

  function reset(){setPhase('idle');setResult(null);setProgress(0);setStatus('Готовы проверить календарную реальность.');}

  const finished=phase==='friday'||phase==='no';

  return (
    <main className={`app phase-${phase}`}>
      <div className="city" aria-hidden="true">
        <span className="tower t1"/><span className="tower t2"/><span className="tower t3"/>
        <span className="tower t4"/><span className="tower t5"/><span className="tower t6"/>
      </div>
      <div className="curtain left"/><div className="curtain right"/>
      <div className="confetti">{confetti.map(p=><i key={p.id} style={{
        '--left':p.left+'%','--delay':p.delay+'s','--duration':p.duration+'s',
        '--hue':p.hue,'--drift':p.drift+'px','--size':p.size+'px'
      }}/>)}</div>

      <header>
        <div className="logo">TODAY-FRIDAY<small>СЕРЬЁЗНЫЕ ВОПРОСЫ<br/>ИМЕЮТ ЗНАЧЕНИЕ</small></div>
        <nav><a href="#about">О проекте</a><a href="#how">Как это работает</a><a href="#faq">FAQ</a></nav>
      </header>

      <section className="stage">
        <div className={`storm ${phase==='reveal'?'explode':''} ${finished?'hiddenStorm':''}`} aria-hidden="true">
          <div className="cloud c1"/><div className="cloud c2"/><div className="cloud c3"/>
          <div className="cloud c4"/><div className="cloud c5"/>
          <i className="bolt b1"/><i className="bolt b2"/><i className="bolt b3"/><i className="bolt b4"/>
        </div>

        <div className="content">
          {!finished ? (
            <>
              <h1>Сегодня<br/><em>пятница?</em></h1>
              <p className="offer">ПОЛУЧИ ТОЧНЫЙ ОТВЕТ<br/>ВСЕГО ЗА</p>
              <div className="price">99 ₽</div>
            </>
          ) : (
            <div className="truth">
              <span>ОФИЦИАЛЬНЫЙ РЕЗУЛЬТАТ</span>
              <h2>{result?.isFriday?'ДА!':'НЕТ.'}</h2>
              <p>{result?.isFriday?'ДАААА! ЭТО ПЯТНИЦА!':'Мы тоже разочарованы.'}</p>
            </div>
          )}

          {phase==='idle' && <button className="cta" onClick={start}>УЗНАТЬ ПРАВДУ <b>→</b></button>}
          {phase==='processing' && <div className="process">
            <div><span>{status}</span><b>{progress}%</b></div>
            <aside><i style={{width:progress+'%'}}/></aside>
          </div>}
          {phase==='error' && <div className="process error"><div><span>{status}</span></div><button className="cta" onClick={reset}>ПОВТОРИТЬ <b>↻</b></button></div>}
          {finished && <button className="cta" onClick={reset}>ПРОВЕРИТЬ ЕЩЁ РАЗ · 99 ₽ <b>↻</b></button>}

          <div className="benefits">
            <article><strong>♢</strong><b>100% точность</b><span>Проверяем по<br/>реальному времени</span></article>
            <article><strong>▣</strong><b>Безопасная оплата</b><span>Платежи защищены</span></article>
            <article><strong>ϟ</strong><b>Моментальный ответ</b><span>Сразу после оплаты</span></article>
          </div>
        </div>
      </section>

      <footer>
        <button className="sound" onClick={()=>setSound(v=>!v)}>{sound?'ЗВУК: ВКЛ':'ЗВУК: ВЫКЛ'}</button>
        <p>ПОТОМУ ЧТО ПЯТНИЦА — ЭТО ВАЖНО.</p>
        <span>© 2026</span>
      </footer>
    </main>
  );
}
