ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS business_owner_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS executive_sponsor_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS delivery_lead_id UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_projects_business_owner_id
  ON projects(business_owner_id);

CREATE INDEX IF NOT EXISTS idx_projects_executive_sponsor_id
  ON projects(executive_sponsor_id);

CREATE INDEX IF NOT EXISTS idx_projects_delivery_lead_id
  ON projects(delivery_lead_id);
