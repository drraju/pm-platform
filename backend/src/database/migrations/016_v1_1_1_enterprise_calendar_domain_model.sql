CREATE TABLE IF NOT EXISTS enterprise_calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
  default_working_days JSONB NOT NULL DEFAULT '[1,2,3,4,5]'::jsonb,
  working_day_start TIME,
  working_day_end TIME,
  hours_per_day NUMERIC(5,2) NOT NULL DEFAULT 8,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by_id UUID REFERENCES users(id),
  updated_by_id UUID REFERENCES users(id),
  deleted_by_id UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS enterprise_calendar_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_calendar_id UUID NOT NULL REFERENCES enterprise_calendars(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  exception_type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  working_day_start TIME,
  working_day_end TIME,
  hours NUMERIC(5,2),
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
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_enterprise_calendars_status'
  ) THEN
    ALTER TABLE enterprise_calendars
      ADD CONSTRAINT chk_enterprise_calendars_status
      CHECK (status IN ('active', 'archived'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_enterprise_calendars_hours'
  ) THEN
    ALTER TABLE enterprise_calendars
      ADD CONSTRAINT chk_enterprise_calendars_hours
      CHECK (hours_per_day > 0 AND hours_per_day <= 24);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_enterprise_calendars_working_time'
  ) THEN
    ALTER TABLE enterprise_calendars
      ADD CONSTRAINT chk_enterprise_calendars_working_time
      CHECK (
        working_day_start IS NULL
        OR working_day_end IS NULL
        OR working_day_end > working_day_start
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_enterprise_calendar_exceptions_type'
  ) THEN
    ALTER TABLE enterprise_calendar_exceptions
      ADD CONSTRAINT chk_enterprise_calendar_exceptions_type
      CHECK (exception_type IN ('holiday', 'non_working', 'working_override'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_enterprise_calendar_exceptions_hours'
  ) THEN
    ALTER TABLE enterprise_calendar_exceptions
      ADD CONSTRAINT chk_enterprise_calendar_exceptions_hours
      CHECK (hours IS NULL OR (hours > 0 AND hours <= 24));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_enterprise_calendar_exceptions_working_time'
  ) THEN
    ALTER TABLE enterprise_calendar_exceptions
      ADD CONSTRAINT chk_enterprise_calendar_exceptions_working_time
      CHECK (
        working_day_start IS NULL
        OR working_day_end IS NULL
        OR working_day_end > working_day_start
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_enterprise_calendars_status
  ON enterprise_calendars(status)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_enterprise_calendars_active_name
  ON enterprise_calendars(name)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_enterprise_calendar_exceptions_calendar
  ON enterprise_calendar_exceptions(enterprise_calendar_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_enterprise_calendar_exceptions_calendar_date
  ON enterprise_calendar_exceptions(enterprise_calendar_id, date)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_enterprise_calendar_exceptions_calendar_type
  ON enterprise_calendar_exceptions(enterprise_calendar_id, exception_type)
  WHERE deleted_at IS NULL;
