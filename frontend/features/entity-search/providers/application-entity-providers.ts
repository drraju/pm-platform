import { hasAnyPermission } from "@/features/auth";
import type { ApiProject } from "@/features/projects";
import type { ApiRaidItem } from "@/features/raid";
import type { ApiTask } from "@/features/tasks";
import type { SearchableEntity } from "@/lib/entities";
import type { PresentableEntityProvider } from "../entity-presentation";

export function createProjectEntityProvider(
  projects: readonly ApiProject[],
): PresentableEntityProvider {
  return {
    id: "entities.projects",
    getEntities: ({ permissionKeys }) =>
      hasAnyPermission([...permissionKeys], ["project.read"])
        ? projects.map(projectEntity)
        : [],
    presentation: {
      category: "Projects",
      maximumResults: 20,
      sectionDescription: "Projects loaded in the current workspace.",
      sectionTitle: "Projects",
    },
  };
}

export function createTaskEntityProvider(
  tasks: readonly ApiTask[],
): PresentableEntityProvider {
  return {
    id: "entities.tasks",
    getEntities: ({ permissionKeys }) =>
      hasAnyPermission([...permissionKeys], [
        "task.update",
        "task.comment",
        "task.reassign",
      ])
        ? tasks.map(taskEntity)
        : [],
    presentation: {
      category: "Tasks",
      maximumResults: 30,
      sectionDescription: "Assigned or visible tasks already loaded in memory.",
      sectionTitle: "Tasks",
    },
  };
}

export function createRaidEntityProvider(
  items: readonly ApiRaidItem[],
): PresentableEntityProvider {
  return {
    id: "entities.raid",
    getEntities: ({ permissionKeys }) =>
      hasAnyPermission([...permissionKeys], ["raid.read"])
        ? items.map(raidEntity)
        : [],
    presentation: {
      category: "RAID",
      maximumResults: 20,
      sectionDescription: "Loaded risks, assumptions, issues, and dependencies.",
      sectionTitle: "RAID",
    },
  };
}

function projectEntity(project: ApiProject): SearchableEntity {
  const health = project.health?.status;

  return {
    category: "Projects",
    icon: "folder",
    id: `project:${project.id}`,
    keywords: compact([
      project.description,
      project.status,
      health,
      userName(project.owner),
      userName(project.deliveryLead),
    ]),
    navigationTarget: `/projects/${project.id}`,
    subtitle: compact([
      formatLabel(project.status),
      health ? `${formatLabel(health)} health` : undefined,
    ]).join(" · "),
    title: project.name,
  };
}

function taskEntity(task: ApiTask): SearchableEntity {
  return {
    category: "Tasks",
    icon: "checklist",
    id: `task:${task.id}`,
    keywords: compact([
      task.description,
      task.priority,
      task.status,
      task.project?.name,
      userName(task.assignee),
    ]),
    navigationTarget: `/projects/${task.projectId}/tasks`,
    subtitle: compact([
      task.project?.name ?? "Project task",
      formatLabel(task.status),
      formatLabel(task.priority),
    ]).join(" · "),
    title: task.title,
  };
}

function raidEntity(item: ApiRaidItem): SearchableEntity {
  return {
    category: "RAID",
    icon: item.type === "risk" ? "warning" : "alert",
    id: `raid:${item.id}`,
    keywords: compact([
      item.description,
      item.type,
      item.status,
      item.severity,
      item.priority,
      item.project?.name,
      userName(item.owner),
    ]),
    navigationTarget: `/projects/${item.projectId}/raid`,
    subtitle: compact([
      formatLabel(item.type),
      item.project?.name ?? "Project RAID",
      formatLabel(item.status),
    ]).join(" · "),
    title: item.title,
  };
}

function compact(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value));
}

function formatLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toLocaleUpperCase());
}

function userName(
  user:
    | {
        firstName: string;
        lastName: string;
      }
    | null
    | undefined,
) {
  return user ? `${user.firstName} ${user.lastName}` : undefined;
}
