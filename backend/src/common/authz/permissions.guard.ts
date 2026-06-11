import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../modules/users/entities/role.entity';
import { PERMISSIONS_KEY, PermissionKey } from './permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Optional()
    @InjectRepository(Role)
    private readonly rolesRepository?: Repository<Role>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<
      PermissionKey[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: { roleId?: string };
    }>();
    const roleId = request.user?.roleId;
    if (!roleId) {
      throw new ForbiddenException('Missing role for permission check');
    }
    if (!this.rolesRepository) {
      throw new ForbiddenException('Permission repository is unavailable');
    }

    const role = await this.rolesRepository.findOne({
      relations: { permissions: true },
      where: { id: roleId },
    });
    const grantedPermissions = new Set(
      role?.permissions?.map((permission) => permission.key) ?? [],
    );

    const hasPermissions = requiredPermissions.every((permission) =>
      grantedPermissions.has(permission),
    );
    if (!hasPermissions) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
