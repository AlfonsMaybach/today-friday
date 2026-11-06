import test from 'node:test';
import assert from 'node:assert/strict';
import { createDiagnostics, startStage, safeDiagnosticError } from '../lib/payment-diagnostics.js';

test('diagnostic report contains only safe stage metadata', () => {
  const report = createDiagnostics();
  const stage = startStage(report, 'POST payments_with_receipt');
  stage.finish({ result: 'FAILED', httpStatus: 400, errorCode: 'ValidationError' });
  assert.equal(report.stages[0].result, 'FAILED');
  assert.equal(report.providerHttpStatus, 400);
  assert.equal(typeof report.correlationId, 'string');
  assert.equal('email' in report, false);
});

test('provider diagnostic sanitizes request identifiers and never exposes response body', () => {
  const safe = safeDiagnosticError({ code: 'BadRequest', status: 400, requestId: 'req-123' });
  assert.deepEqual(safe, { errorCode: 'BadRequest', httpStatus: 400, requestId: 'req-123' });
  assert.equal('body' in safe, false);
});
