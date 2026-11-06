# Today Friday · Payment Preview release gate

Status: **NOT APPROVED FOR PRODUCTION**. This document is a checklist, not proof of passing tests.

## 1. CI (no Vercel)
- [ ] GitHub Actions workflow `Payment regression tests` has a completed successful run on the exact release SHA.
- [ ] `npm ci` succeeds on Node 24.
- [ ] `npm test` succeeds (all suites, not only the isolated reconciliation tests).
- [ ] `npm run build` succeeds with test-only environment and without real bank calls.
- [ ] If no workflow run appears, inspect repository Settings > Actions > General, workflow permissions, and organization Actions policy. Do not treat an empty workflow-runs response as success.

## 2. Payment safety review
- [x] No bank call or database mutation is performed by `selectPaymentLinkCandidate`.
- [x] Reconciliation refuses ambiguous candidates and mismatched link, merchant, amount or currency.
- [x] Invalid/missing order cookie returns 403 in the payment-status handler.
- [ ] Confirm with actual Tochka response that `Data.Operation` contains the fields used by the validator.
- [ ] Verify `GET /acquiring/v1.0/payments/{operationId}` over the existing secure transport with the **already paid** order; read-only, no new charge.
- [ ] Check webhook verification against a signed provider fixture; avoid logging signed payloads and secrets.
- [ ] Audit 50 RUB fiscal receipt in provider dashboard; absence of a local `fiscal_receipts` row is not proof of a missing receipt.
- [ ] Confirm that existing orders remain unchanged; do not migrate or rewrite historic 1 RUB orders.

## 3. Release boundaries
- [ ] Review the four main-only commits before integrating this diverged branch (do not force-merge).
- [ ] Run one controlled Preview build only after CI passes and Vercel build limit clears.
- [ ] Verify email entry, payment link/QR, real 50 RUB SBP checkout, bank return, server-side confirmation, receipt and result access on Preview.
- [ ] Check same-browser retry and no-cookie unauthorized access.
- [ ] Record exact Preview SHA and deployment URL.
- [ ] Obtain separate approval before any Production deployment.

Do not publish the `codex/restore-v41-preview` branch directly as Production.
