-- STAB-DATA-004 Project Purge Hardening & Data Integrity
-- Review-only repair script for legacy orphaned data.
--
-- Run the detection script first. Review affected rows before COMMIT.
-- This script intentionally does not run automatically from application code.

BEGIN;

CREATE TEMP TABLE stab_data_004_orphan_tasks AS
SELECT task.id
FROM tasks task
LEFT JOIN projects project ON project.id = task.project_id
WHERE project.id IS NULL;

CREATE TEMP TABLE stab_data_004_orphan_projects AS
SELECT DISTINCT project_id AS id
FROM (
  SELECT project_id FROM task_execution_updates
  UNION ALL SELECT project_id FROM risks
  UNION ALL SELECT project_id FROM issues
  UNION ALL SELECT project_id FROM assumptions
  UNION ALL SELECT project_id FROM dependencies
  UNION ALL SELECT project_id FROM raid_comments
  UNION ALL SELECT project_id FROM raid_history_entries
  UNION ALL SELECT project_id FROM planning_task_schedules
  UNION ALL SELECT project_id FROM planning_schedule_snapshots
  UNION ALL SELECT project_id FROM resource_allocations
  UNION ALL SELECT project_id FROM resource_capacities WHERE project_id IS NOT NULL
  UNION ALL SELECT project_id FROM resource_workload_snapshots WHERE project_id IS NOT NULL
  UNION ALL SELECT project_id FROM enterprise_resource_assignments
  UNION ALL SELECT project_id FROM project_documents
  UNION ALL SELECT project_id FROM project_members
  UNION ALL SELECT project_id FROM project_baselines
  UNION ALL SELECT project_id FROM project_baseline_tasks
) candidate
LEFT JOIN projects project ON project.id = candidate.project_id
WHERE project.id IS NULL;

SELECT 'orphan_tasks_to_delete' AS repair_scope, COUNT(*) AS count
FROM stab_data_004_orphan_tasks
UNION ALL
SELECT 'orphan_project_ids_to_delete', COUNT(*)
FROM stab_data_004_orphan_projects;

-- Delete children before task/project references. The transaction should be
-- manually inspected before COMMIT.
DELETE FROM task_execution_updates
WHERE task_id IN (SELECT id FROM stab_data_004_orphan_tasks)
   OR project_id IN (SELECT id FROM stab_data_004_orphan_projects);

DELETE FROM task_dependencies
WHERE predecessor_task_id IN (SELECT id FROM stab_data_004_orphan_tasks)
   OR successor_task_id IN (SELECT id FROM stab_data_004_orphan_tasks)
   OR NOT EXISTS (
     SELECT 1 FROM tasks predecessor
     WHERE predecessor.id = task_dependencies.predecessor_task_id
   )
   OR NOT EXISTS (
     SELECT 1 FROM tasks successor
     WHERE successor.id = task_dependencies.successor_task_id
   );

DELETE FROM portfolio_dependencies
WHERE predecessor_project_id IN (SELECT id FROM stab_data_004_orphan_projects)
   OR successor_project_id IN (SELECT id FROM stab_data_004_orphan_projects)
   OR NOT EXISTS (
     SELECT 1 FROM projects predecessor
     WHERE predecessor.id = portfolio_dependencies.predecessor_project_id
   )
   OR NOT EXISTS (
     SELECT 1 FROM projects successor
     WHERE successor.id = portfolio_dependencies.successor_project_id
   );

DELETE FROM planning_task_schedules
WHERE project_id IN (SELECT id FROM stab_data_004_orphan_projects)
   OR task_id IN (SELECT id FROM stab_data_004_orphan_tasks);

DELETE FROM planning_schedule_snapshots
WHERE project_id IN (SELECT id FROM stab_data_004_orphan_projects);

DELETE FROM resource_allocations
WHERE project_id IN (SELECT id FROM stab_data_004_orphan_projects)
   OR task_id IN (SELECT id FROM stab_data_004_orphan_tasks);

DELETE FROM resource_capacities
WHERE project_id IN (SELECT id FROM stab_data_004_orphan_projects);

DELETE FROM resource_workload_snapshots
WHERE project_id IN (SELECT id FROM stab_data_004_orphan_projects);

DELETE FROM enterprise_resource_assignments
WHERE project_id IN (SELECT id FROM stab_data_004_orphan_projects)
   OR task_id IN (SELECT id FROM stab_data_004_orphan_tasks);

DELETE FROM project_documents
WHERE project_id IN (SELECT id FROM stab_data_004_orphan_projects);

DELETE FROM raid_comments
WHERE project_id IN (SELECT id FROM stab_data_004_orphan_projects);

DELETE FROM raid_history_entries
WHERE project_id IN (SELECT id FROM stab_data_004_orphan_projects);

DELETE FROM risks
WHERE project_id IN (SELECT id FROM stab_data_004_orphan_projects);

DELETE FROM issues
WHERE project_id IN (SELECT id FROM stab_data_004_orphan_projects);

DELETE FROM assumptions
WHERE project_id IN (SELECT id FROM stab_data_004_orphan_projects);

DELETE FROM dependencies
WHERE project_id IN (SELECT id FROM stab_data_004_orphan_projects);

DELETE FROM project_baseline_tasks
WHERE project_id IN (SELECT id FROM stab_data_004_orphan_projects)
   OR task_id IN (SELECT id FROM stab_data_004_orphan_tasks);

DELETE FROM project_baselines
WHERE project_id IN (SELECT id FROM stab_data_004_orphan_projects);

DELETE FROM project_members
WHERE project_id IN (SELECT id FROM stab_data_004_orphan_projects);

DELETE FROM tasks
WHERE id IN (SELECT id FROM stab_data_004_orphan_tasks);

-- Re-run detection after these deletes and review the result before commit.
-- COMMIT;
ROLLBACK;
