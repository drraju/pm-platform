import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { ExternalApiPolicyService } from './external-api-policy.service';
import { EXTERNAL_API_RESOURCE_KEY } from './external-api-resource.decorator';
import { ExternalApiResource } from './external-api-resource';

@Injectable()
export class ExternalApiGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly externalApiPolicyService: ExternalApiPolicyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const resource = this.reflector.getAllAndOverride<ExternalApiResource>(
      EXTERNAL_API_RESOURCE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!resource) {
      throw new ForbiddenException('External API access denied');
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
    }>();
    if (
      !(await this.externalApiPolicyService.canRead(request.user, resource))
    ) {
      throw new ForbiddenException('External API access denied');
    }

    return true;
  }
}
