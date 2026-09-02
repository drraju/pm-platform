import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { ExternalApiPolicyService } from '../auth/external-api-policy.service';

export enum ExternalDataScope {
  AllProjects = 'ALL_PROJECTS',
}

export type ResolvedExternalDataScope = Readonly<{
  kind: ExternalDataScope;
}>;

@Injectable()
export class ExternalDataScopeService {
  constructor(private readonly externalApiPolicy: ExternalApiPolicyService) {}

  async resolve(
    actor: AuthenticatedUser | undefined,
  ): Promise<ResolvedExternalDataScope | null> {
    if (!(await this.externalApiPolicy.isEligibleServiceActor(actor))) {
      return null;
    }

    return Object.freeze({ kind: ExternalDataScope.AllProjects });
  }
}
