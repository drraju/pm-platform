import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ANY_PERMISSIONS_KEY,
  PERMISSIONS_KEY,
  PLATFORM_ADMIN_REQUIRED_KEY,
  PermissionKey,
} from './permissions';
import { AuthorizationPolicyService } from './authorization-policy.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationPolicyService: AuthorizationPolicyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<
      PermissionKey[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);
    const anyPermissions = this.reflector.getAllAndOverride<PermissionKey[]>(
      ANY_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    const platformAdminRequired = this.reflector.getAllAndOverride<boolean>(
      PLATFORM_ADMIN_REQUIRED_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (
      !requiredPermissions?.length &&
      !anyPermissions?.length &&
      !platformAdminRequired
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: { email?: string; roleId?: string; userId?: string };
    }>();
    const userId = request.user?.userId;
    const roleId = request.user?.roleId;
    if (!userId || !roleId) {
      throw new ForbiddenException('Missing role for permission check');
    }
    const grantedPermissions =
      await this.authorizationPolicyService.getGrantedPermissionKeys({
        email: request.user?.email,
        roleId,
        userId,
      });

    const hasPermissions =
      !requiredPermissions?.length ||
      requiredPermissions.every((permission) =>
        grantedPermissions.has(permission),
      );
    if (!hasPermissions) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const hasAnyPermission =
      !anyPermissions?.length ||
      anyPermissions.some((permission) => grantedPermissions.has(permission));
    if (!hasAnyPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    if (
      platformAdminRequired &&
      !(await this.authorizationPolicyService.isPlatformAdministrator({
        email: request.user?.email,
        roleId,
        userId,
      }))
    ) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
