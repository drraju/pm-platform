import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { UserIdentityType } from '../../../common/enums/user-identity-type.enum';
import { UserRole } from '../../../common/enums/user-role.enum';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import {
  ExternalApiResource,
  externalV1ReadPermissionMapping,
} from './external-api-resource';

@Injectable()
export class ExternalApiPolicyService {
  constructor(
    private readonly authorizationPolicyService: AuthorizationPolicyService,
  ) {}

  async canRead(
    actor: AuthenticatedUser | undefined,
    resource: ExternalApiResource,
  ): Promise<boolean> {
    if (!(await this.isEligibleServiceActor(actor))) {
      return false;
    }

    const grantedPermissions =
      await this.authorizationPolicyService.getGrantedPermissionKeys(actor);
    return externalV1ReadPermissionMapping[resource].every((permission) =>
      grantedPermissions.has(permission),
    );
  }

  async isEligibleServiceActor(
    actor: AuthenticatedUser | undefined,
  ): Promise<boolean> {
    if (actor?.identityType !== UserIdentityType.Service) {
      return false;
    }

    return (
      (await this.authorizationPolicyService.getActorRoleName(actor)) ===
      String(UserRole.ServiceUser)
    );
  }
}
