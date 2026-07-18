export type ApplicationCommandContext = {
  pathname: string;
  permissionKeys: readonly string[];
  projectId?: string;
};

export function createApplicationCommandContext({
  pathname,
  permissionKeys,
}: Omit<ApplicationCommandContext, "projectId">): ApplicationCommandContext {
  return {
    pathname,
    permissionKeys,
    projectId: getProjectId(pathname),
  };
}

function getProjectId(pathname: string) {
  return pathname.match(/^\/projects\/([^/]+)(?:\/|$)/)?.[1];
}
