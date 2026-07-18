import { hasAnyPermission } from "@/features/auth";
import type { CommandProvider } from "@/lib/commands";
import { dispatchApplicationCommandAction } from "../application-command-actions";
import type { ApplicationCommandContext } from "../application-command-context";

export function createProjectQuickActionProvider(
  context: ApplicationCommandContext,
): CommandProvider {
  return {
    id: "projects.quick-actions",
    getCommands: () => [
      {
        action: () =>
          dispatchApplicationCommandAction({ type: "project.create" }),
        category: "Projects",
        enabled:
          context.pathname === "/projects" &&
          hasAnyPermission([...context.permissionKeys], ["project.create"]),
        icon: "plus",
        id: "projects.new",
        keywords: ["create", "add", "new project"],
        subtitle: "Open the existing project creation dialog",
        title: "New Project",
      },
    ],
  };
}

export function createTaskQuickActionProvider(
  context: ApplicationCommandContext,
): CommandProvider {
  return {
    id: "tasks.quick-actions",
    getCommands: () => [
      {
        category: "Tasks",
        enabled: hasAnyPermission([...context.permissionKeys], [
          "task.update",
          "task.comment",
          "task.reassign",
        ]),
        icon: "checklist",
        id: "tasks.mine",
        keywords: ["assigned", "work", "my tasks"],
        navigationTarget: "/tasks",
        subtitle: "Open your assigned work queue",
        title: "My Tasks",
      },
    ],
  };
}

export function createCurrentProjectProvider(
  context: ApplicationCommandContext,
): CommandProvider {
  return {
    id: "project.context",
    getCommands: () =>
      context.projectId
        ? [
            {
              category: "Projects",
              enabled: hasAnyPermission([...context.permissionKeys], [
                "project.read",
              ]),
              icon: "folder-open",
              id: "project.current.open",
              keywords: ["current", "overview", "project"],
              navigationTarget: `/projects/${context.projectId}`,
              subtitle: "Open the current project overview",
              title: "Current Project Overview",
            },
          ]
        : [],
  };
}

export function createRaidQuickActionProvider(
  context: ApplicationCommandContext,
): CommandProvider {
  const canCreate = hasAnyPermission([...context.permissionKeys], [
    "raid.create",
  ]);
  const supportsRisk =
    context.pathname === "/raid" ||
    context.pathname === "/risks" ||
    isProjectRaidPath(context.pathname);
  const supportsIssue =
    context.pathname === "/raid" ||
    context.pathname === "/issues" ||
    isProjectRaidPath(context.pathname);

  return {
    id: "raid.quick-actions",
    getCommands: () => [
      ...(supportsRisk
        ? [
            {
              action: () =>
                dispatchApplicationCommandAction({
                  projectId: context.projectId,
                  raidType: "risk",
                  type: "raid.create",
                }),
              category: "RAID",
              enabled: canCreate,
              icon: "warning",
              id: "raid.new-risk",
              keywords: ["create", "add", "new risk"],
              subtitle: "Open the existing risk creation dialog",
              title: "New Risk",
            },
          ]
        : []),
      ...(supportsIssue
        ? [
            {
              action: () =>
                dispatchApplicationCommandAction({
                  projectId: context.projectId,
                  raidType: "issue",
                  type: "raid.create",
                }),
              category: "RAID",
              enabled: canCreate,
              icon: "alert",
              id: "raid.new-issue",
              keywords: ["create", "add", "new issue"],
              subtitle: "Open the existing issue creation dialog",
              title: "New Issue",
            },
          ]
        : []),
    ],
  };
}

export function createContextualCommandProviders(
  context: ApplicationCommandContext,
) {
  return [
    createProjectQuickActionProvider(context),
    createTaskQuickActionProvider(context),
    createCurrentProjectProvider(context),
    createRaidQuickActionProvider(context),
  ];
}

function isProjectRaidPath(pathname: string) {
  return /^\/projects\/[^/]+\/raid$/.test(pathname);
}
