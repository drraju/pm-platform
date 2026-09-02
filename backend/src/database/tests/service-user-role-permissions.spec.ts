import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { developmentSeedData } from '../../../scripts/seed';
import {
  PermissionKey,
  serviceUserPermissionKeys,
} from '../../common/authz/permissions';
import { UserIdentityType } from '../../common/enums/user-identity-type.enum';
import {
  canonicalUserRoles,
  UserRole,
} from '../../common/enums/user-role.enum';

const migrationPath = join(
  __dirname,
  '..',
  'migrations',
  '039_stab_iam_004_service_user_role_permissions.sql',
);

const expectedExternalPermissions = [
  'external.api.access',
  'external.project.read',
  'external.task.read',
  'external.raid.read',
];

describe('SERVICE_USER role and external permissions', () => {
  const migrationSql = readFileSync(migrationPath, 'utf8');

  it('defines SERVICE_USER as a distinct canonical global role', () => {
    expect(UserRole.ServiceUser).toBe('SERVICE_USER');
    expect(canonicalUserRoles).toContain(UserRole.ServiceUser);
    expect([
      UserRole.PlatformAdmin,
      UserRole.Executive,
      UserRole.PortfolioManager,
      UserRole.ProjectManager,
      UserRole.TeamMember,
      UserRole.Customer,
      UserRole.Partner,
    ]).not.toContain(UserRole.ServiceUser);
    expect(migrationSql).toContain(
      "VALUES ('SERVICE_USER', 'External API service identity')",
    );
  });

  it('defines exactly the four stable Phase-1 external permissions', () => {
    expect(serviceUserPermissionKeys).toEqual(expectedExternalPermissions);
    expect(
      Object.values(PermissionKey).filter((key) => key.startsWith('external.')),
    ).toEqual(expectedExternalPermissions);
    expect(new Set(serviceUserPermissionKeys).size).toBe(4);
  });

  it('does not introduce Phase-2 external permission vocabulary', () => {
    expect(Object.values(PermissionKey)).not.toEqual(
      expect.arrayContaining([
        'external.forecast.read',
        'external.milestone.read',
        'external.portfolio.read',
        'external.planning.read',
        'external.document.read',
        'external.resource.read',
      ]),
    );
  });

  it('seeds SERVICE_USER with exactly the external permissions and nothing else', () => {
    expect(
      developmentSeedData.permissionsByRoleName[UserRole.ServiceUser],
    ).toEqual(expectedExternalPermissions);
    expect(
      developmentSeedData.permissionsByRoleName[UserRole.ServiceUser],
    ).not.toEqual(
      expect.arrayContaining([
        PermissionKey.PermissionManage,
        PermissionKey.ProjectCreate,
        PermissionKey.ProjectUpdate,
        PermissionKey.RaidCreate,
        PermissionKey.RoleManage,
        PermissionKey.TaskCreate,
        PermissionKey.TaskUpdate,
        PermissionKey.UserManage,
      ]),
    );
  });

  it('does not assign external permissions to existing human roles', () => {
    const externalPermissionSet = new Set<PermissionKey>(
      serviceUserPermissionKeys,
    );

    for (const roleName of canonicalUserRoles) {
      if (roleName === UserRole.ServiceUser) {
        continue;
      }

      expect(
        developmentSeedData.permissionsByRoleName[roleName].filter(
          (permissionKey) => externalPermissionSet.has(permissionKey),
        ),
      ).toEqual([]);
    }
  });

  it('makes the migration assignment exact and idempotent', () => {
    const migratedExternalPermissions = [
      ...new Set(
        [...migrationSql.matchAll(/'(?<key>external\.[^']+)'/g)].map(
          (match) => match.groups?.key,
        ),
      ),
    ];

    expect(migratedExternalPermissions).toEqual(expectedExternalPermissions);
    expect(migrationSql).toMatch(
      /DELETE FROM role_permissions\s+USING roles[\s\S]*roles\.name = 'SERVICE_USER'/,
    );
    for (const permissionKey of expectedExternalPermissions) {
      expect(migrationSql).toContain(`'${permissionKey}'`);
    }
    expect(migrationSql).toMatch(
      /ON CONFLICT \(role_id, permission_id\) DO NOTHING/,
    );
  });

  it('creates no SERVICE users and changes no existing user or project data', () => {
    expect(
      developmentSeedData.users.some(
        (user) =>
          'identityType' in user &&
          user.identityType === UserIdentityType.Service,
      ),
    ).toBe(false);
    expect(migrationSql).not.toMatch(
      /(?:INSERT INTO|UPDATE|DELETE FROM)\s+users\b/i,
    );
    expect(migrationSql).not.toMatch(
      /(?:INSERT INTO|UPDATE|DELETE FROM)\s+(?:projects|project_members)\b/i,
    );
  });
});
