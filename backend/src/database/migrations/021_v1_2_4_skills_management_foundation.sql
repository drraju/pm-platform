CREATE TABLE IF NOT EXISTS enterprise_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'proposed',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by_id UUID REFERENCES users(id),
  updated_by_id UUID REFERENCES users(id),
  deleted_by_id UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS enterprise_resource_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES enterprise_resources(id),
  skill_id UUID NOT NULL REFERENCES enterprise_skills(id),
  proficiency_level VARCHAR(50) NOT NULL,
  years_experience INT,
  months_experience INT,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  notes TEXT,
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
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_enterprise_skills_status'
  ) THEN
    ALTER TABLE enterprise_skills
      ADD CONSTRAINT chk_enterprise_skills_status
      CHECK (status IN ('proposed', 'active', 'deprecated', 'archived'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_enterprise_resource_skills_proficiency'
  ) THEN
    ALTER TABLE enterprise_resource_skills
      ADD CONSTRAINT chk_enterprise_resource_skills_proficiency
      CHECK (
        proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_enterprise_resource_skills_status'
  ) THEN
    ALTER TABLE enterprise_resource_skills
      ADD CONSTRAINT chk_enterprise_resource_skills_status
      CHECK (status IN ('draft', 'active', 'archived'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_enterprise_resource_skills_years_experience'
  ) THEN
    ALTER TABLE enterprise_resource_skills
      ADD CONSTRAINT chk_enterprise_resource_skills_years_experience
      CHECK (years_experience IS NULL OR years_experience >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_enterprise_resource_skills_months_experience'
  ) THEN
    ALTER TABLE enterprise_resource_skills
      ADD CONSTRAINT chk_enterprise_resource_skills_months_experience
      CHECK (
        months_experience IS NULL
        OR (months_experience >= 0 AND months_experience <= 11)
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_enterprise_skills_active_name_unique
  ON enterprise_skills (LOWER(name))
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_enterprise_skills_category
  ON enterprise_skills(category)
  WHERE deleted_at IS NULL AND category IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_enterprise_skills_status
  ON enterprise_skills(status)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_enterprise_resource_skills_active_unique
  ON enterprise_resource_skills(resource_id, skill_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_enterprise_resource_skills_resource
  ON enterprise_resource_skills(resource_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_enterprise_resource_skills_skill
  ON enterprise_resource_skills(skill_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_enterprise_resource_skills_status
  ON enterprise_resource_skills(status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_enterprise_resource_skills_proficiency
  ON enterprise_resource_skills(proficiency_level)
  WHERE deleted_at IS NULL;
