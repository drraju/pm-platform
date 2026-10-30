export type AppNavigationItem = {
  href: string;
  id: string;
  label: string;
  permissions: string[];
  section: "Work" | "Delivery" | "Customers" | "Leadership" | "Administration";
};

// Sign-in stays out until that screen exists.
export const appNavigation: AppNavigationItem[] = [
  {
    href: "/today",
    id: "today",
    label: "Today",
    permissions: ["work.update", "task.update"],
    section: "Work",
  },
  {
    href: "/projects",
    id: "projects",
    label: "Projects",
    permissions: ["project.read"],
    section: "Delivery",
  },
  {
    href: "/customers",
    id: "customers",
    label: "Customers",
    permissions: ["customer.read"],
    section: "Customers",
  },
  {
    href: "/programs",
    id: "programs",
    label: "Programs",
    permissions: ["program.view"],
    section: "Leadership",
  },
  {
    href: "/users",
    id: "people",
    label: "People",
    permissions: ["user.manage"],
    section: "Administration",
  },
];

export function isNavigationItemActive(
  pathname: string,
  item: Pick<AppNavigationItem, "href">,
) {
  if (item.href === "/projects" && pathname.includes("/planning")) {
    return false;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
