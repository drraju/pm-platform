export type AppNavigationItem = {
  href?: string;
  id: string;
  label: string;
  permissions: string[];
  section: "Workspaces" | "Work queues" | "Administration";
  unavailableHint?: string;
};

export const appNavigation: AppNavigationItem[] = [
  {
    href: "/dashboard",
    id: "home",
    label: "Home",
    permissions: ["dashboard.view"],
    section: "Workspaces",
  },
  {
    href: "/portfolio",
    id: "portfolio",
    label: "Portfolio",
    permissions: ["portfolio.view"],
    section: "Workspaces",
  },
  {
    href: "/projects",
    id: "projects",
    label: "Projects",
    permissions: ["project.read"],
    section: "Workspaces",
  },
  {
    href: "/daily-review",
    id: "daily-review",
    label: "Daily Review",
    permissions: ["project.read", "task.update"],
    section: "Workspaces",
  },
  {
    id: "planning",
    label: "Planning",
    permissions: ["project.read"],
    section: "Workspaces",
    unavailableHint: "Open Planning from a project",
  },
  {
    id: "resources",
    label: "Resources",
    permissions: ["project.read"],
    section: "Workspaces",
    unavailableHint: "Resource workspace is not available yet",
  },
  {
    href: "/executive",
    id: "intelligence",
    label: "Intelligence",
    permissions: ["executive.view"],
    section: "Workspaces",
  },
  {
    href: "/ai-playground",
    id: "ai-playground",
    label: "AI Playground",
    permissions: ["user.manage"],
    section: "Administration",
  },
  {
    href: "/tasks",
    id: "my-tasks",
    label: "My Tasks",
    permissions: ["task.update", "task.comment"],
    section: "Work queues",
  },
  {
    href: "/risks",
    id: "risks",
    label: "Risks",
    permissions: ["raid.read"],
    section: "Work queues",
  },
  {
    href: "/issues",
    id: "issues",
    label: "Issues",
    permissions: ["raid.read"],
    section: "Work queues",
  },
  {
    href: "/calendar",
    id: "calendar",
    label: "Enterprise Calendars",
    permissions: ["project.update"],
    section: "Administration",
  },
  {
    href: "/users",
    id: "users",
    label: "User Administration",
    permissions: ["user.manage"],
    section: "Administration",
  },
];

export function isNavigationItemActive(
  pathname: string,
  item: AppNavigationItem,
) {
  if (!item.href) {
    return item.label === "Planning" && pathname.includes("/planning");
  }

  if (item.href === "/projects" && pathname.includes("/planning")) {
    return false;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
