import { hasAnyPermission } from "@/features/auth";
import type { CommandDefinition, CommandProvider } from "@/lib/commands";
import type { ApplicationCommandContext } from "../application-command-context";

type NavigationProviderOptions = {
  command: CommandDefinition;
  permissionKeys: readonly string[];
  providerId: string;
  requiredPermissions: readonly string[];
};

function navigationProvider({
  command,
  permissionKeys,
  providerId,
  requiredPermissions,
}: NavigationProviderOptions): CommandProvider {
  return {
    id: providerId,
    getCommands: () => [
      {
        ...command,
        enabled: hasAnyPermission([...permissionKeys], [...requiredPermissions]),
      },
    ],
  };
}

export function createDashboardCommandProvider(
  context: ApplicationCommandContext,
) {
  return navigationProvider({
    command: {
      category: "Navigation",
      icon: "home",
      id: "dashboard.open",
      keywords: ["home", "personal", "workspace"],
      navigationTarget: "/dashboard",
      subtitle: "Open your personal delivery dashboard",
      title: "Go to Dashboard",
    },
    permissionKeys: context.permissionKeys,
    providerId: "dashboard",
    requiredPermissions: ["dashboard.view"],
  });
}

export function createExecutiveCommandProvider(
  context: ApplicationCommandContext,
) {
  return navigationProvider({
    command: {
      category: "Navigation",
      icon: "chart",
      id: "executive.open",
      keywords: ["intelligence", "leadership", "health"],
      navigationTarget: "/executive",
      subtitle: "Open cross-project executive insight",
      title: "Go to Executive Dashboard",
    },
    permissionKeys: context.permissionKeys,
    providerId: "executive",
    requiredPermissions: ["executive.view"],
  });
}

export function createPortfolioCommandProvider(
  context: ApplicationCommandContext,
) {
  return navigationProvider({
    command: {
      category: "Navigation",
      icon: "portfolio",
      id: "portfolio.open",
      keywords: ["program", "oversight", "summary"],
      navigationTarget: "/portfolio",
      subtitle: "Open portfolio oversight and decisions",
      title: "Go to Portfolio",
    },
    permissionKeys: context.permissionKeys,
    providerId: "portfolio",
    requiredPermissions: ["portfolio.view"],
  });
}

export function createProjectsCommandProvider(
  context: ApplicationCommandContext,
) {
  return navigationProvider({
    command: {
      category: "Projects",
      icon: "folder",
      id: "projects.open",
      keywords: ["delivery", "workspace", "list"],
      navigationTarget: "/projects",
      subtitle: "Browse and manage projects",
      title: "Open My Projects",
    },
    permissionKeys: context.permissionKeys,
    providerId: "projects",
    requiredPermissions: ["project.read"],
  });
}

export function createPlanningCommandProvider(
  context: ApplicationCommandContext,
) {
  return navigationProvider({
    command: {
      category: "Planning",
      icon: "timeline",
      id: "planning.open",
      keywords: ["schedule", "timeline", "wbs"],
      navigationTarget: context.projectId
        ? `/projects/${context.projectId}/planning`
        : "/projects",
      subtitle: context.projectId
        ? "Open planning for the current project"
        : "Choose a project to open its planning workspace",
      title: "Go to Planning",
    },
    permissionKeys: context.permissionKeys,
    providerId: "planning",
    requiredPermissions: ["project.read"],
  });
}

export function createRaidCommandProvider(context: ApplicationCommandContext) {
  return navigationProvider({
    command: {
      category: "RAID",
      icon: "warning",
      id: "raid.open",
      keywords: ["risks", "assumptions", "issues", "dependencies"],
      navigationTarget: context.projectId
        ? `/projects/${context.projectId}/raid`
        : "/raid",
      subtitle: context.projectId
        ? "Open RAID for the current project"
        : "Open the cross-project RAID register",
      title: "Go to RAID",
    },
    permissionKeys: context.permissionKeys,
    providerId: "raid",
    requiredPermissions: ["raid.read"],
  });
}

export function createNavigationCommandProviders(
  context: ApplicationCommandContext,
) {
  return [
    createDashboardCommandProvider(context),
    createExecutiveCommandProvider(context),
    createPortfolioCommandProvider(context),
    createProjectsCommandProvider(context),
    createPlanningCommandProvider(context),
    createRaidCommandProvider(context),
  ];
}
