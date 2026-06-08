import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AuthenticatedPrincipal,
  AuthorizationService,
} from '../../authorization/authorization.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly authorizationService: AuthorizationService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedPrincipal;
    }>();
    if (!request.user?.userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const user = await this.authorizationService.getEffectiveUser(
      request.user.userId,
    );
    if (user.roleName !== 'Admin') {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
