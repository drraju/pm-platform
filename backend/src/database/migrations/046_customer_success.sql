ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS last_touch date;

CREATE TABLE IF NOT EXISTS customer_commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers (id),
  project_id uuid NOT NULL REFERENCES projects (id),
  task_id uuid REFERENCES tasks (id),
  title text NOT NULL,
  due_date date,
  status varchar(32) NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_commitments_status_check CHECK (status IN ('open', 'accepted', 'dismissed'))
);

CREATE INDEX IF NOT EXISTS customer_commitments_customer_id_idx
  ON customer_commitments (customer_id);

CREATE INDEX IF NOT EXISTS customer_commitments_project_id_idx
  ON customer_commitments (project_id);
