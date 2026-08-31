import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
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

  async validate(payload: JwtPayload) {
    if (payload.tokenType !== 'access' || !payload.iat) {
      throw new UnauthorizedException('Invalid session');
    }
    const user = await this.usersService.findTokenValidationUser(payload.sub);
    if (!user || !['active', 'first_login_pending'].includes(user.status)) {
      throw new UnauthorizedException('Invalid session');
    }
    if (user.roleId !== payload.roleId || user.email !== payload.email) {
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
      roleId: user.roleId,
    };
  }
}
