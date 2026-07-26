export type AppNavigationItem = {
  href?: string;
  label: string;
  permissions: string[];
  section: "Workspaces" | "Work queues" | "Administration";
  unavailableHint?: string;
};

export const appNavigation: AppNavigationItem[] = [
  {
    href: "/dashboard",
    label: "Home",
    permissions: ["dashboard.view"],
    section: "Workspaces",
  },
  {
    href: "/portfolio",
    label: "Portfolio",
    permissions: ["portfolio.view"],
    section: "Workspaces",
  },
  {
    href: "/projects",
    label: "Projects",
    permissions: ["project.read"],
    section: "Workspaces",
  },
  {
    label: "Planning",
    permissions: ["project.read"],
    section: "Workspaces",
    unavailableHint: "Open Planning from a project",
  },
  {
    label: "Resources",
    permissions: ["project.read"],
    section: "Workspaces",
    unavailableHint: "Resource workspace is not available yet",
  },
  {
    href: "/executive",
    label: "Intelligence",
    permissions: ["executive.view"],
    section: "Workspaces",
  },
  {
    href: "/tasks",
    label: "My Tasks",
    permissions: ["task.update", "task.comment"],
    section: "Work queues",
  },
  {
    href: "/risks",
    label: "Risks",
    permissions: ["raid.read"],
    section: "Work queues",
  },
  {
    href: "/issues",
    label: "Issues",
    permissions: ["raid.read"],
    section: "Work queues",
  },
  {
    href: "/calendar",
    label: "Enterprise Calendars",
    permissions: ["project.update"],
    section: "Administration",
  },
  {
    href: "/users",
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
