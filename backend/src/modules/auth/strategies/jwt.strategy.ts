import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'development-jwt-secret',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findTokenValidationUser(payload.sub);
    if (!user || !['active', 'first_login_pending'].includes(user.status)) {
      throw new UnauthorizedException('Invalid session');
    }

    if (user.passwordChangedAt && payload.iat) {
      const issuedAt = payload.iat * 1000;
      if (issuedAt < user.passwordChangedAt.getTime()) {
        throw new UnauthorizedException('Invalid session');
      }
    }

    return {
      userId: payload.sub,
      email: payload.email,
      roleId: payload.roleId,
    };
  }
}
