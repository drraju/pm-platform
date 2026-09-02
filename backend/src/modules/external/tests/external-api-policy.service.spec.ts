import { AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { PermissionKey } from '../../../common/authz/permissions';
import { ProjectRole } from '../../../common/enums/project-role.enum';
import { UserIdentityType } from '../../../common/enums/user-identity-type.enum';
import { UserRole } from '../../../common/enums/user-role.enum';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { ExternalApiPolicyService } from '../auth/external-api-policy.service';
import {
  ExternalApiResource,
  externalV1ReadPermissionMapping,
} from '../auth/external-api-resource';

describe('ExternalApiPolicyService', () => {
  let grantedPermissions: Set<string>;
  let roleName: string | null;
  let authorizationPolicy: {
    getActorRoleName: jest.Mock;
    getGrantedPermissionKeys: jest.Mock;
  };
  let service: ExternalApiPolicyService;

  beforeEach(() => {
    grantedPermissions = new Set();
    roleName = UserRole.ServiceUser;
    authorizationPolicy = {
      getActorRoleName: jest.fn(() => Promise.resolve(roleName)),
      getGrantedPermissionKeys: jest.fn(() =>
        Promise.resolve(grantedPermissions),
      ),
    };
    service = new ExternalApiPolicyService(
      authorizationPolicy as unknown as AuthorizationPolicyService,
    );
  });

  it('denies a HUMAN even when every external permission is granted', async () => {
    grant(...externalPermissions());

    await expect(
      service.canRead(humanActor(), ExternalApiResource.Projects),
    ).resolves.toBe(false);
    expect(authorizationPolicy.getActorRoleName).not.toHaveBeenCalled();
    expect(authorizationPolicy.getGrantedPermissionKeys).not.toHaveBeenCalled();
  });

  it.each([
    ['no permissions', []],
    ['API access only', [PermissionKey.ExternalApiAccess]],
    ['domain permission only', [PermissionKey.ExternalProjectRead]],
    [
      'all internal permissions without external API access',
      Object.values(PermissionKey).filter(
        (permission) => !permission.startsWith('external.'),
      ),
    ],
  ])('denies SERVICE project reads with %s', async (_name, permissions) => {
    grant(...permissions);

    await expect(
      service.canRead(serviceActor(), ExternalApiResource.Projects),
    ).resolves.toBe(false);
  });

  it('allows SERVICE with API access and the exact domain permission', async () => {
    grant(PermissionKey.ExternalApiAccess, PermissionKey.ExternalProjectRead);

    await expect(
      service.canRead(serviceActor(), ExternalApiResource.Projects),
    ).resolves.toBe(true);
  });

  it.each([UserRole.PlatformAdmin, UserRole.ProjectManager, null])(
    'denies SERVICE when the current database role is %s',
    async (resolvedRoleName) => {
      roleName = resolvedRoleName;
      grant(...externalPermissions());

      await expect(
        service.canRead(serviceActor(), ExternalApiResource.Projects),
      ).resolves.toBe(false);
    },
  );

  it.each([undefined, null, UserIdentityType.Human])(
    'denies malformed or non-service identity context %s',
    async (identityType) => {
      grant(...externalPermissions());
      const actor = identityType
        ? { ...serviceActor(), identityType }
        : identityType === null
          ? ({ ...serviceActor(), identityType: null } as never)
          : undefined;

      await expect(
        service.canRead(actor, ExternalApiResource.Projects),
      ).resolves.toBe(false);
    },
  );

  it.each([undefined, ProjectRole.Owner, ProjectRole.Manager])(
    'does not use project membership role %s for external authorization',
    async (projectRole) => {
      grant(PermissionKey.ExternalApiAccess, PermissionKey.ExternalProjectRead);
      const actor = { ...serviceActor(), projectRole } as AuthenticatedUser;

      await expect(
        service.canRead(actor, ExternalApiResource.Projects),
      ).resolves.toBe(true);
    },
  );

  it.each(Object.values(ExternalApiResource))(
    'enforces the centralized permission mapping for %s',
    async (resource) => {
      const [apiAccess, domainPermission] =
        externalV1ReadPermissionMapping[resource];
      grant(apiAccess, domainPermission);
      await expect(service.canRead(serviceActor(), resource)).resolves.toBe(
        true,
      );

      grant(apiAccess);
      await expect(service.canRead(serviceActor(), resource)).resolves.toBe(
        false,
      );
    },
  );

  function grant(...permissions: PermissionKey[]) {
    grantedPermissions = new Set(permissions);
  }
});

function externalPermissions(): PermissionKey[] {
  return [
    PermissionKey.ExternalApiAccess,
    PermissionKey.ExternalProjectRead,
    PermissionKey.ExternalTaskRead,
    PermissionKey.ExternalRaidRead,
  ];
}

function serviceActor(): AuthenticatedUser {
  return {
    email: 'automation@example.com',
    identityType: UserIdentityType.Service,
    roleId: 'role-service-user',
    userId: 'service-1',
  };
}

function humanActor(): AuthenticatedUser {
  return {
    ...serviceActor(),
    email: 'human@example.com',
    identityType: UserIdentityType.Human,
    userId: 'human-1',
  };
}
