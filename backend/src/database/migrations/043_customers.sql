CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(200) NOT NULL,
  status varchar(32) NOT NULL DEFAULT 'active',
  owner_id uuid NOT NULL REFERENCES users (id),
  domain varchar(200),
  renewal_date date,
  commercial_note text,
  success_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_customers_status CHECK (status IN ('prospect', 'active', 'paused', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_customers_owner_status ON customers (owner_id, status);
