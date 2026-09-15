(() => {
  const payButton = document.querySelector('#pay-button');
  const againButton = document.querySelector('#again-button');
  const status = document.querySelector('#status');
  const before = document.querySelector('#before-payment');
  const result = document.querySelector('#result');
  const answer = document.querySelector('#answer');
  const resultCopy = document.querySelector('#result-copy');
  const cloud = document.querySelector('#cloud');

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  async function api(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Ошибка сервера');
    return data;
  }

  async function start() {
    payButton.disabled = true;
    payButton.textContent = 'СОЗДАЁМ ПЛАТЁЖ…';
    status.textContent = '';

    try {
      const payment = await api('/api/create-payment', { method: 'POST' });

      if (payment.payment_url) {
        window.location.href = payment.payment_url;
        return;
      }

      payButton.textContent = 'ПРОВЕРЯЕМ ОПЛАТУ…';
      status.textContent = 'Ждём подтверждение платежа…';

      for (let i = 0; i < 60; i++) {
        const current = await api('/api/payment-status?payment_id=' + encodeURIComponent(payment.payment_id));
        if (current.status === 'paid') {
          await reveal(payment.payment_id);
          return;
        }
        await sleep(2000);
      }

      throw new Error('Платёж пока не подтверждён. Попробуйте ещё раз.');
    } catch (e) {
      status.textContent = e.message;
      payButton.disabled = false;
      payButton.textContent = 'УЗНАТЬ ПРАВДУ';
    }
  }

  async function reveal(paymentId) {
    const data = await api('/api/result?payment_id=' + encodeURIComponent(paymentId));
    cloud.classList.add('disperse');
    await sleep(650);

    before.classList.add('hidden');
    result.classList.remove('hidden');
    result.classList.toggle('friday', data.is_friday);
    result.classList.toggle('no', !data.is_friday);

    if (data.is_friday) {
      answer.textContent = 'ДА! 🎉';
      resultCopy.textContent = 'С ПЯТНИЦЕЙ!';
      celebrate();
    } else {
      answer.textContent = 'НЕТ 😔';
      resultCopy.textContent = 'Мы тоже разочарованы.';
    }
  }

  function celebrate() {
    document.body.classList.add('party');
    if (navigator.vibrate) navigator.vibrate([100, 60, 140]);
    confetti();
  }

  function confetti() {
    const canvas = document.querySelector('#confetti');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.scale(dpr, dpr);

    const pieces = Array.from({length: 180}, () => ({
      x: innerWidth / 2,
      y: innerHeight / 2,
      vx: (Math.random() - .5) * 18,
      vy: (Math.random() - .75) * 18,
      g: .25 + Math.random() * .2,
      r: 2 + Math.random() * 5,
      hue: Math.random() * 360,
      life: 90 + Math.random() * 60
    }));

    function frame() {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      let alive = false;
      for (const p of pieces) {
        if (p.life-- <= 0) continue;
        alive = true;
        p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= .992;
        ctx.fillStyle = `hsl(${p.hue} 90% 55%)`;
        ctx.fillRect(p.x, p.y, p.r * 2, p.r);
      }
      if (alive) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, innerWidth, innerHeight);
    }
    frame();
  }

  againButton.addEventListener('click', () => location.reload());
  payButton.addEventListener('click', start);
})();
