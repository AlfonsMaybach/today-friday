-- Applied to Preview Neon on 2026-11-05.
ALTER TABLE orders DROP COLUMN IF EXISTS customer_email;
ALTER TABLE payment_webhooks DROP COLUMN IF EXISTS payload;
ALTER TABLE fiscal_receipts DROP COLUMN IF EXISTS raw_status;
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket_key TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL CHECK (request_count >= 0)
);
