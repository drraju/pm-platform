ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS account_history JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE users
SET account_history = '[]'::jsonb
WHERE account_history IS NULL;
