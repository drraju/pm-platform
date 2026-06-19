CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  predecessor_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  successor_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  dependency_type VARCHAR(2) NOT NULL,
  lag_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by_id UUID REFERENCES users(id),
  updated_by_id UUID REFERENCES users(id),
  deleted_by_id UUID REFERENCES users(id),
  CONSTRAINT chk_task_dependencies_not_self CHECK (
    predecessor_task_id <> successor_task_id
  )
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_task_dependencies_dependency_type'
  ) THEN
    ALTER TABLE task_dependencies
      ADD CONSTRAINT chk_task_dependencies_dependency_type
      CHECK (dependency_type IN ('FS', 'SS', 'FF', 'SF'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_task_dependencies_predecessor_task_id
  ON task_dependencies(predecessor_task_id);

CREATE INDEX IF NOT EXISTS idx_task_dependencies_successor_task_id
  ON task_dependencies(successor_task_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_task_dependencies_active_unique_edge
  ON task_dependencies(predecessor_task_id, successor_task_id)
  WHERE deleted_at IS NULL;
