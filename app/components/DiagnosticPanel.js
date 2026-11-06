'use client';

import { useState } from 'react';

export default function DiagnosticPanel({ report, onClose }) {
  const [copied, setCopied] = useState(false);
  if (!report) return null;
  const json = JSON.stringify(report, null, 2);
  function download() { const blob = new Blob([json], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `today-friday-payment-${report.correlationId}.json`; link.click(); URL.revokeObjectURL(url); }
  async function copy() { await navigator.clipboard?.writeText(json); setCopied(true); setTimeout(() => setCopied(false), 1600); }
  const failed = report.failedStage || report.stages.some((stage) => stage.result === 'FAILED');
  return <aside className="diagnostic-panel" aria-live="polite"><button className="diagnostic-close" onClick={onClose} aria-label="Закрыть диагностику">×</button><strong>Диагностика платежа</strong><span className={failed ? 'diagnostic-failed' : 'diagnostic-success'}>{failed ? 'FAILED' : 'SUCCESS'}</span><dl><dt>Этап</dt><dd>{report.failedStage || report.stages.at(-1)?.name || '—'}</dd><dt>HTTP</dt><dd>{report.providerHttpStatus || '—'}</dd><dt>Код</dt><dd>{report.errorCode || '—'}</dd><dt>ID обращения</dt><dd>{report.correlationId}</dd></dl><div className="diagnostic-actions"><button onClick={download}>Скачать отчёт JSON</button><button onClick={copy}>{copied ? 'Скопировано' : 'Скопировать отчёт'}</button></div></aside>;
}
