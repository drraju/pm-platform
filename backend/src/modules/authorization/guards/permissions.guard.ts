import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationService, AuthenticatedPrincipal } from '../authorization.service';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { PermissionKey } from '../permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions =
      this.reflector.getAllAndOverride<PermissionKey[]>(
        REQUIRED_PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? [];

    if (requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedPrincipal;
    }>();
    if (!request.user?.userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const user = await this.authorizationService.getEffectiveUser(
      request.user.userId,
    );
    this.authorizationService.assertHasAnyPermission(user, requiredPermissions);
    return true;
  }
}

