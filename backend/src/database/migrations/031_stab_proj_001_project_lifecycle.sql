CREATE OR REPLACE FUNCTION prevent_project_baseline_task_mutation()
RETURNS trigger AS $$
BEGIN
  IF current_setting('pm_platform.project_purge', true) = 'on' THEN
    RETURN OLD;
  END IF;

  RAISE EXCEPTION 'Project baseline tasks are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_project_baseline_mutation()
RETURNS trigger AS $$
BEGIN
  IF current_setting('pm_platform.project_purge', true) = 'on' THEN
    RETURN OLD;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Project baselines are immutable';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.project_id IS DISTINCT FROM OLD.project_id
    OR NEW.name IS DISTINCT FROM OLD.name
    OR NEW.version_number IS DISTINCT FROM OLD.version_number
    OR NEW.captured_at IS DISTINCT FROM OLD.captured_at
    OR NEW.captured_by_id IS DISTINCT FROM OLD.captured_by_id
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
    OR NEW.created_by_id IS DISTINCT FROM OLD.created_by_id
    OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
    OR NEW.deleted_by_id IS DISTINCT FROM OLD.deleted_by_id
  THEN
    RAISE EXCEPTION 'Project baselines are immutable';
  END IF;

  IF NEW.status NOT IN ('draft', 'approved', 'superseded') THEN
    RAISE EXCEPTION 'Project baseline status must be a lifecycle status';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
