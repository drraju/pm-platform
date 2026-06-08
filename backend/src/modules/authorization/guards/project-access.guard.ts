import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationService, AuthenticatedPrincipal } from '../authorization.service';
import {
  PROJECT_ACCESS_KEY,
  ProjectAccessPolicy,
} from '../decorators/project-access.decorator';

@Injectable()
export class ProjectAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policy = this.reflector.getAllAndOverride<ProjectAccessPolicy>(
      PROJECT_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!policy) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      params?: Record<string, string>;
      user?: AuthenticatedPrincipal;
    }>();
    if (!request.user?.userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const projectId = request.params?.[policy.param ?? 'id'];
    if (!projectId) {
      throw new ForbiddenException('Project id is required');
    }

    const user = await this.authorizationService.getEffectiveUser(
      request.user.userId,
    );

    if (
      policy.bypassPermissions &&
      this.authorizationService.hasAnyPermission(user, policy.bypassPermissions)
    ) {
      return true;
    }

    if (policy.mode === 'read') {
      await this.authorizationService.assertCanReadProject(user, projectId);
      return true;
    }

    if (policy.mode === 'manage') {
      await this.authorizationService.assertCanManageProjectTasks(user, projectId);
      return true;
    }

    await this.authorizationService.assertCanManageProjectMembers(user, projectId);
    return true;
  }
}

