-- STAB-DATA-004 Project Purge Hardening & Data Integrity
-- Detect legacy orphaned project-owned data. This script is read-only.

SELECT 'tasks_missing_project' AS orphan_type, COUNT(*) AS count
FROM tasks task
LEFT JOIN projects project ON project.id = task.project_id
WHERE project.id IS NULL

UNION ALL
SELECT 'milestones_missing_project', COUNT(*)
FROM tasks task
LEFT JOIN projects project ON project.id = task.project_id
WHERE task.task_kind = 'milestone'
  AND project.id IS NULL

UNION ALL
SELECT 'execution_updates_missing_task', COUNT(*)
FROM task_execution_updates execution_update
LEFT JOIN tasks task ON task.id = execution_update.task_id
WHERE task.id IS NULL

UNION ALL
SELECT 'execution_updates_missing_project', COUNT(*)
FROM task_execution_updates execution_update
LEFT JOIN projects project ON project.id = execution_update.project_id
WHERE project.id IS NULL

UNION ALL
SELECT 'task_dependencies_missing_task', COUNT(*)
FROM task_dependencies dependency
LEFT JOIN tasks predecessor ON predecessor.id = dependency.predecessor_task_id
LEFT JOIN tasks successor ON successor.id = dependency.successor_task_id
WHERE predecessor.id IS NULL
   OR successor.id IS NULL

UNION ALL
SELECT 'portfolio_dependencies_missing_project', COUNT(*)
FROM portfolio_dependencies dependency
LEFT JOIN projects predecessor
  ON predecessor.id = dependency.predecessor_project_id
LEFT JOIN projects successor
  ON successor.id = dependency.successor_project_id
WHERE predecessor.id IS NULL
   OR successor.id IS NULL

UNION ALL
SELECT 'raid_missing_project', COUNT(*)
FROM (
  SELECT project_id FROM risks
  UNION ALL SELECT project_id FROM issues
  UNION ALL SELECT project_id FROM assumptions
  UNION ALL SELECT project_id FROM dependencies
) raid_item
LEFT JOIN projects project ON project.id = raid_item.project_id
WHERE project.id IS NULL

UNION ALL
SELECT 'raid_comments_missing_project', COUNT(*)
FROM raid_comments comment
LEFT JOIN projects project ON project.id = comment.project_id
WHERE project.id IS NULL

UNION ALL
SELECT 'raid_history_missing_project', COUNT(*)
FROM raid_history_entries history
LEFT JOIN projects project ON project.id = history.project_id
WHERE project.id IS NULL

UNION ALL
SELECT 'planning_missing_project', COUNT(*)
FROM (
  SELECT project_id FROM planning_task_schedules
  UNION ALL SELECT project_id FROM planning_schedule_snapshots
  UNION ALL SELECT project_id FROM resource_allocations
  UNION ALL SELECT project_id FROM resource_capacities WHERE project_id IS NOT NULL
  UNION ALL SELECT project_id FROM resource_workload_snapshots WHERE project_id IS NOT NULL
) planning_item
LEFT JOIN projects project ON project.id = planning_item.project_id
WHERE project.id IS NULL

UNION ALL
SELECT 'documents_missing_project', COUNT(*)
FROM project_documents document
LEFT JOIN projects project ON project.id = document.project_id
WHERE project.id IS NULL

UNION ALL
SELECT 'resource_assignments_missing_project', COUNT(*)
FROM enterprise_resource_assignments assignment
LEFT JOIN projects project ON project.id = assignment.project_id
WHERE project.id IS NULL

UNION ALL
SELECT 'project_members_missing_project', COUNT(*)
FROM project_members member
LEFT JOIN projects project ON project.id = member.project_id
WHERE project.id IS NULL

UNION ALL
SELECT 'project_baselines_missing_project', COUNT(*)
FROM project_baselines baseline
LEFT JOIN projects project ON project.id = baseline.project_id
WHERE project.id IS NULL

UNION ALL
SELECT 'project_baseline_tasks_missing_project', COUNT(*)
FROM project_baseline_tasks baseline_task
LEFT JOIN projects project ON project.id = baseline_task.project_id
WHERE project.id IS NULL;

-- Foreign-key posture for project-owned tables.
SELECT
  conrelid::regclass AS table_name,
  conname,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE contype = 'f'
  AND conrelid::regclass::text IN (
    'tasks',
    'task_execution_updates',
    'task_dependencies',
    'portfolio_dependencies',
    'risks',
    'issues',
    'assumptions',
    'dependencies',
    'raid_comments',
    'raid_history_entries',
    'planning_task_schedules',
    'planning_schedule_snapshots',
    'resource_allocations',
    'resource_capacities',
    'resource_workload_snapshots',
    'enterprise_resource_assignments',
    'project_documents',
    'project_members',
    'project_baselines',
    'project_baseline_tasks'
  )
ORDER BY table_name, conname;
