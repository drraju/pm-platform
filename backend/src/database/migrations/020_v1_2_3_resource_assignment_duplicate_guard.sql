CREATE UNIQUE INDEX IF NOT EXISTS idx_enterprise_resource_assignments_active_unique
  ON enterprise_resource_assignments(
    resource_id,
    project_id,
    start_date,
    end_date,
    COALESCE(task_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE deleted_at IS NULL;
