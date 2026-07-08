CREATE TABLE IF NOT EXISTS enterprise_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  user_id UUID REFERENCES users(id),
  role_name VARCHAR(255),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by_id UUID REFERENCES users(id),
  updated_by_id UUID REFERENCES users(id),
  deleted_by_id UUID REFERENCES users(id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_enterprise_resources_type'
  ) THEN
    ALTER TABLE enterprise_resources
      ADD CONSTRAINT chk_enterprise_resources_type
      CHECK (
        resource_type IN (
          'human',
          'contractor',
          'team',
          'equipment',
          'facility',
          'vehicle',
          'generic'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_enterprise_resources_status'
  ) THEN
    ALTER TABLE enterprise_resources
      ADD CONSTRAINT chk_enterprise_resources_status
      CHECK (status IN ('draft', 'active', 'inactive', 'archived'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_enterprise_resources_active_name
  ON enterprise_resources(name)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_enterprise_resources_type
  ON enterprise_resources(resource_type)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_enterprise_resources_status
  ON enterprise_resources(status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_enterprise_resources_user
  ON enterprise_resources(user_id)
  WHERE deleted_at IS NULL AND user_id IS NOT NULL;
