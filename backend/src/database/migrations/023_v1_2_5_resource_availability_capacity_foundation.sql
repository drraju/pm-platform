CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS enterprise_resource_capacity_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES enterprise_resources(id),
  capacity_minutes_per_working_day INT NOT NULL,
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by_id UUID REFERENCES users(id),
  updated_by_id UUID REFERENCES users(id),
  deleted_by_id UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS enterprise_resource_availability_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES enterprise_resources(id),
  override_type VARCHAR(50) NOT NULL,
  available_minutes_per_working_day INT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
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
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_enterprise_resource_capacity_policies_status'
  ) THEN
    ALTER TABLE enterprise_resource_capacity_policies
      ADD CONSTRAINT chk_enterprise_resource_capacity_policies_status
      CHECK (status IN ('draft', 'active', 'archived'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_enterprise_resource_capacity_policies_capacity'
  ) THEN
    ALTER TABLE enterprise_resource_capacity_policies
      ADD CONSTRAINT chk_enterprise_resource_capacity_policies_capacity
      CHECK (capacity_minutes_per_working_day >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_enterprise_resource_capacity_policies_dates'
  ) THEN
    ALTER TABLE enterprise_resource_capacity_policies
      ADD CONSTRAINT chk_enterprise_resource_capacity_policies_dates
      CHECK (
        effective_end_date IS NULL
        OR effective_start_date <= effective_end_date
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_enterprise_resource_availability_overrides_type'
  ) THEN
    ALTER TABLE enterprise_resource_availability_overrides
      ADD CONSTRAINT chk_enterprise_resource_availability_overrides_type
      CHECK (override_type IN ('unavailable', 'reduced_capacity'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_enterprise_resource_availability_overrides_minutes'
  ) THEN
    ALTER TABLE enterprise_resource_availability_overrides
      ADD CONSTRAINT chk_enterprise_resource_availability_overrides_minutes
      CHECK (
        available_minutes_per_working_day IS NULL
        OR available_minutes_per_working_day >= 0
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_enterprise_resource_availability_overrides_dates'
  ) THEN
    ALTER TABLE enterprise_resource_availability_overrides
      ADD CONSTRAINT chk_enterprise_resource_availability_overrides_dates
      CHECK (start_date <= end_date);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_enterprise_resource_availability_overrides_shape'
  ) THEN
    ALTER TABLE enterprise_resource_availability_overrides
      ADD CONSTRAINT chk_enterprise_resource_availability_overrides_shape
      CHECK (
        (override_type = 'unavailable' AND available_minutes_per_working_day IS NULL)
        OR (
          override_type = 'reduced_capacity'
          AND available_minutes_per_working_day IS NOT NULL
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_enterprise_resource_capacity_policies_resource
  ON enterprise_resource_capacity_policies(resource_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_enterprise_resource_capacity_policies_status
  ON enterprise_resource_capacity_policies(status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_enterprise_resource_capacity_policies_effective_start
  ON enterprise_resource_capacity_policies(effective_start_date)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_enterprise_resource_capacity_policies_effective_end
  ON enterprise_resource_capacity_policies(effective_end_date)
  WHERE deleted_at IS NULL AND effective_end_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_enterprise_resource_availability_overrides_resource
  ON enterprise_resource_availability_overrides(resource_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_enterprise_resource_availability_overrides_type
  ON enterprise_resource_availability_overrides(override_type)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_enterprise_resource_availability_overrides_start_date
  ON enterprise_resource_availability_overrides(start_date)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_enterprise_resource_availability_overrides_end_date
  ON enterprise_resource_availability_overrides(end_date)
  WHERE deleted_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'excl_enterprise_resource_capacity_policies_active_period'
  ) THEN
    ALTER TABLE enterprise_resource_capacity_policies
      ADD CONSTRAINT excl_enterprise_resource_capacity_policies_active_period
      EXCLUDE USING gist (
        resource_id WITH =,
        daterange(
          effective_start_date,
          COALESCE(effective_end_date, 'infinity'::date),
          '[]'
        ) WITH &&
      )
      WHERE (deleted_at IS NULL AND status = 'active');
  END IF;
END $$;
