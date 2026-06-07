# Database Schema

## Overview

The backend uses TypeORM entities mapped to PostgreSQL tables. Core entities inherit common timestamp columns:

- `id`: UUID primary key for most tables.
- `created_at`: creation timestamp.
- `updated_at`: update timestamp.
- `deleted_at`: soft-delete timestamp on auditable entities.
- `created_by_id`, `updated_by_id`, `deleted_by_id`: audit user references on auditable entities.

`users` extends `TimestampedEntity`, so it has `id`, `created_at`, and `updated_at` but no soft-delete columns in the current entity.

## ERD-Style Diagram

```text
roles 1 ────< users
roles >────< permissions
        role_permissions

users 1 ────< project_members >──── 1 projects
users 1 ────< notifications
users 1 ────< tasks                 projects 1 ────< tasks
users 1 ────< risks                 projects 1 ────< risks
users 1 ────< issues                projects 1 ────< issues
users 1 ────< assumptions           projects 1 ────< assumptions
users 1 ────< dependencies          projects 1 ────< dependencies

projects.owner_id ─────> users.id
tasks.assignee_id ─────> users.id
RAID owner_id ─────────> users.id
```

## users

Purpose:

- Stores platform users for authentication, ownership, assignment, membership, and notifications.

Important columns:

- `id`
- `email`
- `first_name`
- `last_name`
- `password_hash`
- `role_id`
- `status`
- `created_at`
- `updated_at`

Relationships:

- Many users belong to one role.
- One user can have many project memberships.
- One user can have many notifications.
- Users can own projects, tasks, and RAID records through related foreign keys.

Security note:

- `password_hash` is configured with `select: false` and is removed from API responses by response sanitization.

## roles

Purpose:

- Defines role names and descriptions for user access classification.

Important columns:

- `id`
- `name`
- `description`
- `created_at`
- `updated_at`
- `deleted_at`
- `created_by_id`
- `updated_by_id`
- `deleted_by_id`

Relationships:

- One role has many users.
- Roles have many permissions through `role_permissions`.

## permissions

Purpose:

- Defines permission keys that can be assigned to roles.

Important columns:

- `id`
- `key`
- `description`
- `created_at`
- `updated_at`
- `deleted_at`

Relationships:

- Permissions have many roles through `role_permissions`.

## role_permissions

Purpose:

- Join table between roles and permissions.

Important columns:

- `role_id`
- `permission_id`
- `created_at`
- `created_by_id`

Relationships:

- Each row references one role.
- Each row references one permission.
- `created_by_id` optionally references the user who assigned the permission.

## projects

Purpose:

- Stores delivery projects and their core metadata.

Important columns:

- `id`
- `name`
- `description`
- `status`
- `start_date`
- `target_end_date`
- `owner_id`
- `created_at`
- `updated_at`
- `deleted_at`

Relationships:

- A project can have one owner user.
- A project has many members, tasks, risks, issues, assumptions, and dependencies.

## project_members

Purpose:

- Stores project team membership and project role.

Important columns:

- `id`
- `project_id`
- `user_id`
- `role`
- `created_at`
- `updated_at`
- `deleted_at`

Relationships:

- Many memberships reference one project.
- Many memberships reference one user.
- A uniqueness constraint prevents duplicate membership for the same `project_id` and `user_id`.

## tasks

Purpose:

- Stores project tasks and individual work assignments.

Important columns:

- `id`
- `project_id`
- `title`
- `description`
- `assignee_id`
- `status`
- `priority`
- `start_date`
- `due_date`
- `created_at`
- `updated_at`
- `deleted_at`

Relationships:

- Many tasks belong to one project.
- Many tasks can be assigned to one user.

Portfolio use:

- Portfolio overdue task reporting counts tasks with `due_date` before the current date and excludes `DONE` tasks.

## risks

Purpose:

- Stores RAID risk records.

Important columns:

- `id`
- `project_id`
- `type`
- `title`
- `description`
- `owner_id`
- `status`
- `probability`
- `impact`
- `mitigation_plan`
- `created_at`
- `updated_at`
- `deleted_at`

Relationships:

- Many risks belong to one project.
- Many risks can be owned by one user.

Portfolio use:

- Portfolio risk reporting counts open risks by `impact` value: critical, high, medium, and low.

## issues

Purpose:

- Stores RAID issue records.

Important columns:

- `id`
- `project_id`
- `type`
- `title`
- `description`
- `owner_id`
- `status`
- `severity`
- `resolution_plan`
- `created_at`
- `updated_at`
- `deleted_at`

Relationships:

- Many issues belong to one project.
- Many issues can be owned by one user.

Portfolio use:

- Portfolio issue reporting counts open issues by `severity` as priority: critical, high, medium, and low.

## assumptions

Purpose:

- Stores RAID assumption records and validation status.

Important columns:

- `id`
- `project_id`
- `type`
- `title`
- `description`
- `owner_id`
- `status`
- `validation_status`
- `validation_notes`
- `created_at`
- `updated_at`
- `deleted_at`

Relationships:

- Many assumptions belong to one project.
- Many assumptions can be owned by one user.

## dependencies

Purpose:

- Stores RAID dependency records.

Important columns:

- `id`
- `project_id`
- `type`
- `title`
- `description`
- `owner_id`
- `status`
- `depends_on`
- `due_date`
- `created_at`
- `updated_at`
- `deleted_at`

Relationships:

- Many dependencies belong to one project.
- Many dependencies can be owned by one user.

## notifications

Purpose:

- Stores user notifications.

Important columns:

- `id`
- `user_id`
- `title`
- `body`
- `type`
- `read_at`
- `created_at`
- `updated_at`
- `deleted_at`

Relationships:

- Many notifications belong to one user.

## Registered Entity Set

The application registers the following entities in `databaseEntities`:

- `User`
- `Role`
- `Permission`
- `RolePermission`
- `Project`
- `ProjectMember`
- `Task`
- `Risk`
- `Issue`
- `Assumption`
- `Dependency`
- `Notification`
