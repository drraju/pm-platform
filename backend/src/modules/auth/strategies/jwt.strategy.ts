import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { userIdentityTypes } from '../../../common/enums/user-identity-type.enum';
import { UsersService } from '../../users/users.service';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { JWT_CONFIGURATION } from '../jwt-configuration';
import type { JwtConfiguration } from '../jwt-configuration';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly usersService: UsersService,
    @Inject(JWT_CONFIGURATION)
    private readonly jwtConfiguration: JwtConfiguration,
  ) {
    super({
      algorithms: [jwtConfiguration.algorithm],
      audience: jwtConfiguration.accessAudience,
      issuer: jwtConfiguration.issuer,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfiguration.accessSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (
      payload.tokenType !== 'access' ||
      !payload.iat ||
      !userIdentityTypes.includes(payload.identityType)
    ) {
      throw new UnauthorizedException('Invalid session');
    }
    const user = await this.usersService.findTokenValidationUser(payload.sub);
    if (!user || !['active', 'first_login_pending'].includes(user.status)) {
      throw new UnauthorizedException('Invalid session');
    }
    if (
      user.roleId !== payload.roleId ||
      user.email !== payload.email ||
      user.identityType !== payload.identityType
    ) {
      throw new UnauthorizedException('Invalid session');
    }

    if (user.passwordChangedAt) {
      const issuedAt = payload.iat * 1000;
      if (issuedAt < user.passwordChangedAt.getTime()) {
        throw new UnauthorizedException('Invalid session');
      }
    }

    return {
      userId: payload.sub,
      email: user.email,
      identityType: user.identityType,
      roleId: user.roleId,
    };
  }
}
