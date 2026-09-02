import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ExternalApiRequest,
  ExternalDataScopeService,
} from '../scope/external-data-scope';
import { ExternalApiPolicyService } from './external-api-policy.service';
import { EXTERNAL_API_RESOURCE_KEY } from './external-api-resource.decorator';
import { ExternalApiResource } from './external-api-resource';

@Injectable()
export class ExternalApiGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly externalApiPolicyService: ExternalApiPolicyService,
    private readonly externalDataScopeService: ExternalDataScopeService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const resource = this.reflector.getAllAndOverride<ExternalApiResource>(
      EXTERNAL_API_RESOURCE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!resource) {
      throw new ForbiddenException('External API access denied');
    }

    const request = context.switchToHttp().getRequest<ExternalApiRequest>();
    if (
      !(await this.externalApiPolicyService.canRead(request.user, resource))
    ) {
      throw new ForbiddenException('External API access denied');
    }

    const scope = await this.externalDataScopeService.resolve(request.user);
    if (!scope) {
      throw new ForbiddenException('External API access denied');
    }
    request.externalDataScope = scope;

    return true;
  }
}
