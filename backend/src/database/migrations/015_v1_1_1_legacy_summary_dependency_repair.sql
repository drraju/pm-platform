DO $$
DECLARE
  removed_count INTEGER := 0;
BEGIN
  WITH legacy_dependencies AS (
    SELECT task_dependency.id
    FROM task_dependencies task_dependency
    JOIN tasks predecessor_task
      ON predecessor_task.id = task_dependency.predecessor_task_id
    JOIN tasks successor_task
      ON successor_task.id = task_dependency.successor_task_id
    WHERE predecessor_task.task_kind = 'summary'
       OR successor_task.task_kind = 'summary'
  ),
  deleted_dependencies AS (
    DELETE FROM task_dependencies
    WHERE id IN (SELECT id FROM legacy_dependencies)
    RETURNING id
  )
  SELECT COUNT(*) INTO removed_count
  FROM deleted_dependencies;

  RAISE NOTICE 'Removed % legacy dependencies referencing Summary tasks.', removed_count;
END $$;
