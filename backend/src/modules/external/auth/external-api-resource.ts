import { PermissionKey } from '../../../common/authz/permissions';

export enum ExternalApiResource {
  Issues = 'issues',
  Projects = 'projects',
  Risks = 'risks',
  Tasks = 'tasks',
}

export const externalV1ReadPermissionMapping = Object.freeze({
  [ExternalApiResource.Projects]: Object.freeze([
    PermissionKey.ExternalApiAccess,
    PermissionKey.ExternalProjectRead,
  ]),
  [ExternalApiResource.Tasks]: Object.freeze([
    PermissionKey.ExternalApiAccess,
    PermissionKey.ExternalTaskRead,
  ]),
  [ExternalApiResource.Risks]: Object.freeze([
    PermissionKey.ExternalApiAccess,
    PermissionKey.ExternalRaidRead,
  ]),
  [ExternalApiResource.Issues]: Object.freeze([
    PermissionKey.ExternalApiAccess,
    PermissionKey.ExternalRaidRead,
  ]),
} satisfies Record<ExternalApiResource, readonly PermissionKey[]>);

export const externalV1ReadEndpoints = Object.freeze(
  Object.values(ExternalApiResource).map((resource) => ({
    method: 'GET' as const,
    path: `/external/v1/${resource}`,
    permissions: externalV1ReadPermissionMapping[resource],
    resource,
  })),
);
