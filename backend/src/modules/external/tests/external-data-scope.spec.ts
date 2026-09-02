import { ProjectRole } from '../../../common/enums/project-role.enum';
import { UserIdentityType } from '../../../common/enums/user-identity-type.enum';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { ExternalApiPolicyService } from '../auth/external-api-policy.service';
import {
  ExternalDataScope,
  ExternalDataScopeService,
} from '../scope/external-data-scope';

describe('ExternalDataScopeService', () => {
  let eligible: boolean;
  let policy: { isEligibleServiceActor: jest.Mock };
  let service: ExternalDataScopeService;

  beforeEach(() => {
    eligible = true;
    policy = {
      isEligibleServiceActor: jest.fn(() => Promise.resolve(eligible)),
    };
    service = new ExternalDataScopeService(
      policy as unknown as ExternalApiPolicyService,
    );
  });

  it.each([undefined, ProjectRole.Owner, ProjectRole.Manager])(
    'resolves eligible SERVICE to ALL_PROJECTS regardless of membership %s',
    async (projectRole) => {
      const actor = { ...serviceActor(), projectRole } as AuthenticatedUser;

      await expect(service.resolve(actor)).resolves.toEqual({
        kind: ExternalDataScope.AllProjects,
      });
    },
  );

  it('never resolves HUMAN to ALL_PROJECTS', async () => {
    eligible = false;
    const actor = {
      ...serviceActor(),
      identityType: UserIdentityType.Human,
    };

    await expect(service.resolve(actor)).resolves.toBeNull();
  });
});

function serviceActor(): AuthenticatedUser {
  return {
    email: 'automation@example.com',
    identityType: UserIdentityType.Service,
    roleId: 'role-service-user',
    userId: 'service-1',
  };
}
