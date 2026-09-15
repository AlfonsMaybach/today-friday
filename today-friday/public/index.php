<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#f1efe9">
  <title>Сегодня пятница?</title>
  <meta name="description" content="99 ₽ за правду. Узнайте, сегодня пятница или нет.">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/css/app.css">
</head>
<body>
<canvas id="confetti" aria-hidden="true"></canvas>
<main class="app">
  <section class="card">
    <div class="eyebrow">СЕРВИС АБСОЛЮТНОЙ ВАЖНОСТИ</div>
    <h1>СЕГОДНЯ<br>ПЯТНИЦА?</h1>
    <p class="subtitle">Мы не гарантируем, что вам понравится ответ.</p>

    <div id="oracle" class="oracle">
      <div id="cloud" class="cloud">?</div>
    </div>

    <div id="before-payment">
      <div class="price">99 ₽ <span>за правду</span></div>
      <button id="pay-button" class="primary">УЗНАТЬ ПРАВДУ</button>
      <p id="status" class="fine-print">Ответ откроется только после подтверждения оплаты.</p>
    </div>

    <section id="result" class="result hidden" aria-live="polite">
      <div id="answer" class="answer"></div>
      <p id="result-copy"></p>
      <button id="again-button" class="secondary">ПРОВЕРИТЬ ЕЩЁ РАЗ — 99 ₽</button>
    </section>
  </section>
</main>
<script src="/assets/js/app.js"></script>
</body>
</html>
