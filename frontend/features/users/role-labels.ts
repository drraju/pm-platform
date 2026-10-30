const roleCatalog: Record<string, { label: string; hint: string }> = {
  PLATFORM_ADMIN: {
    label: "Super Admin",
    hint: "Sign-in settings and full administration",
  },
  ADMIN: {
    label: "Admin",
    hint: "People, customers, and projects",
  },
  PORTFOLIO_MANAGER: {
    label: "Portfolio Manager",
    hint: "Cross-project reporting",
  },
  PROGRAM_MANAGER: {
    label: "Program Manager",
    hint: "A set of projects and their customers",
  },
  PROJECT_MANAGER: {
    label: "Project Manager",
    hint: "Projects where they are a member",
  },
  CUSTOMER_SUCCESS_MANAGER: {
    label: "Customer Success Manager",
    hint: "Customers they own and linked project health",
  },
  EXECUTIVE: {
    label: "Executive",
    hint: "Company health, read only",
  },
  SALES: {
    label: "Sales",
    hint: "Customers and commercial fields",
  },
  TEAM_MEMBER: {
    label: "Team Member",
    hint: "Delivery work on assigned projects",
  },
  PARTNER: {
    label: "Partner",
    hint: "Limited collaboration on assigned projects",
  },
  CUSTOMER: {
    label: "Customer",
    hint: "Read-only view of assigned projects",
  },
  SERVICE_USER: {
    label: "Service account",
    hint: "Machine identity for the API",
  },
};

export function roleLabel(name: string) {
  return roleCatalog[name]?.label ?? titleFromCode(name);
}

export function roleHint(name: string) {
  return roleCatalog[name]?.hint ?? "";
}

export function isHumanRole(name: string) {
  return name !== "SERVICE_USER";
}

function titleFromCode(name: string) {
  return name
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
