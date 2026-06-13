ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by_id UUID REFERENCES users(id);

ALTER TABLE issues
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by_id UUID REFERENCES users(id);

ALTER TABLE assumptions
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by_id UUID REFERENCES users(id);

ALTER TABLE dependencies
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by_id UUID REFERENCES users(id);

CREATE TABLE IF NOT EXISTS raid_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raid_item_id UUID NOT NULL,
  raid_type raid_type NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  author_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by_id UUID REFERENCES users(id),
  updated_by_id UUID REFERENCES users(id),
  deleted_by_id UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS raid_history_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raid_item_id UUID NOT NULL,
  raid_type raid_type NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  field_name VARCHAR(100),
  previous_value TEXT,
  next_value TEXT,
  changes JSONB,
  actor_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by_id UUID REFERENCES users(id),
  updated_by_id UUID REFERENCES users(id),
  deleted_by_id UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_raid_comments_item
  ON raid_comments(raid_item_id, raid_type, created_at);

CREATE INDEX IF NOT EXISTS idx_raid_comments_project
  ON raid_comments(project_id, created_at);

CREATE INDEX IF NOT EXISTS idx_raid_history_entries_item
  ON raid_history_entries(raid_item_id, raid_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_raid_history_entries_project
  ON raid_history_entries(project_id, created_at DESC);
