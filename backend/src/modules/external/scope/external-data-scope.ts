import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  createParamDecorator,
} from '@nestjs/common';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { ExternalApiPolicyService } from '../auth/external-api-policy.service';

export enum ExternalDataScope {
  AllProjects = 'ALL_PROJECTS',
}

export type ResolvedExternalDataScope = Readonly<{
  kind: ExternalDataScope;
}>;

export type ExternalApiRequest = {
  externalDataScope?: ResolvedExternalDataScope;
  user?: AuthenticatedUser;
};

export const ExternalScope = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ResolvedExternalDataScope => {
    const scope = context
      .switchToHttp()
      .getRequest<ExternalApiRequest>().externalDataScope;
    if (!scope) {
      throw new ForbiddenException('External API access denied');
    }
    return scope;
  },
);

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
