import crypto from 'crypto';

export function diagnosticsEnabled() {
  return process.env.VERCEL_ENV === 'preview' && process.env.PAYMENT_DIAGNOSTICS_ENABLED === 'true';
}

export function createDiagnostics() {
  return { project: 'today-friday', environment: 'preview', timestamp: new Date().toISOString(), commit: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown', correlationId: crypto.randomUUID(), stages: [], failedStage: null, errorCode: null, providerHttpStatus: null, providerRequestId: null };
}

export function startStage(report, name) {
  const stage = { name, startedAt: new Date().toISOString(), durationMs: null, result: 'RUNNING', httpStatus: null, errorCode: null };
  report.stages.push(stage);
  return { stage, finish({ result = 'SUCCESS', httpStatus = null, errorCode = null } = {}) { stage.durationMs = Date.now() - Date.parse(stage.startedAt); stage.result = result; stage.httpStatus = httpStatus; stage.errorCode = errorCode; if (result === 'FAILED') { report.failedStage = name; report.errorCode = errorCode; report.providerHttpStatus = httpStatus; } } };
}

export function safeDiagnosticError(error) {
  return { errorCode: error?.code || error?.name || 'INTEGRATION_ERROR', httpStatus: Number.isInteger(error?.status) ? error.status : null, requestId: typeof error?.requestId === 'string' && /^[A-Za-z0-9._:-]{1,100}$/.test(error.requestId) ? error.requestId : null };
}
