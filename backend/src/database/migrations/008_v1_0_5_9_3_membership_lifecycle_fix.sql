DO $$
DECLARE
  membership_unique_constraint_name TEXT;
BEGIN
  SELECT constraint_name
  INTO membership_unique_constraint_name
  FROM information_schema.table_constraints
  WHERE table_name = 'project_members'
    AND constraint_type = 'UNIQUE'
    AND constraint_name IN (
      'project_members_project_id_user_id_key',
      'UQ_7dba9de71eeb9c5727ea45e2f8e'
    )
  LIMIT 1;

  IF membership_unique_constraint_name IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE project_members DROP CONSTRAINT %I',
      membership_unique_constraint_name
    );
  END IF;
END $$;

DROP INDEX IF EXISTS idx_project_members_active_project_user_unique;

CREATE UNIQUE INDEX idx_project_members_active_project_user_unique
  ON project_members(project_id, user_id)
  WHERE deleted_at IS NULL;
