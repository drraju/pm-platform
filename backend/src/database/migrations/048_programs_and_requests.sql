CREATE TABLE IF NOT EXISTS programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(200) NOT NULL,
  owner_id uuid NOT NULL REFERENCES users (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_by_id uuid,
  updated_by_id uuid,
  deleted_by_id uuid
);

CREATE INDEX IF NOT EXISTS idx_programs_owner ON programs (owner_id);

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES programs (id);

CREATE INDEX IF NOT EXISTS idx_projects_program_id ON projects (program_id);

CREATE TABLE IF NOT EXISTS project_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers (id),
  name varchar(200) NOT NULL,
  target_finish date,
  note text,
  status varchar(32) NOT NULL DEFAULT 'open',
  project_id uuid REFERENCES projects (id),
  requested_by_id uuid REFERENCES users (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE project_requests
  DROP CONSTRAINT IF EXISTS project_requests_status_check;

ALTER TABLE project_requests
  ADD CONSTRAINT project_requests_status_check
    CHECK (status IN ('open', 'closed'));

CREATE INDEX IF NOT EXISTS idx_project_requests_customer
  ON project_requests (customer_id, status);
