ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers (id);

CREATE INDEX IF NOT EXISTS idx_projects_customer_id ON projects (customer_id);
