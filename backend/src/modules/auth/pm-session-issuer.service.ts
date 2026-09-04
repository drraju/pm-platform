import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/entities/user.entity';
import { SessionAuthenticationContext } from './authentication-method';
import { SessionDto } from './dto/session.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { JWT_CONFIGURATION } from './jwt-configuration';
import type { JwtConfiguration } from './jwt-configuration';

export type PmSessionPrincipal = Pick<
  User,
  'email' | 'id' | 'identityType' | 'passwordChangedAt' | 'roleId'
>;

export type PmSessionOptions = {
  requiresPasswordChange?: boolean;
};

@Injectable()
export class PmSessionIssuer {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(JWT_CONFIGURATION)
    private readonly jwtConfiguration: JwtConfiguration,
  ) {}

  issue(
    principal: PmSessionPrincipal,
    authenticationContext: SessionAuthenticationContext,
    options: PmSessionOptions = {},
  ): SessionDto {
    const sharedClaims: Omit<JwtPayload, 'iat' | 'tokenType'> = {
      authenticatedAt: authenticationContext.authenticatedAt,
      authenticationMethod: authenticationContext.authenticationMethod,
      email: principal.email,
      identityType: principal.identityType,
      passwordChangedAt: principal.passwordChangedAt?.toISOString() ?? null,
      roleId: principal.roleId,
      sub: principal.id,
    };
    const accessToken = this.jwtService.sign(
      {
        ...sharedClaims,
        tokenType: 'access',
      },
      {
        algorithm: this.jwtConfiguration.algorithm,
        audience: this.jwtConfiguration.accessAudience,
        expiresIn: this.jwtConfiguration.accessExpiresIn,
        issuer: this.jwtConfiguration.issuer,
        secret: this.jwtConfiguration.accessSecret,
      },
    );
    const refreshToken = this.jwtService.sign(
      {
        ...sharedClaims,
        tokenType: 'refresh',
      },
      {
        algorithm: this.jwtConfiguration.algorithm,
        audience: this.jwtConfiguration.refreshAudience,
        expiresIn: this.jwtConfiguration.refreshExpiresIn,
        issuer: this.jwtConfiguration.issuer,
        secret: this.jwtConfiguration.refreshSecret,
      },
    );

    return {
      accessToken,
      refreshToken,
      ...(options.requiresPasswordChange
        ? { requiresPasswordChange: true }
        : {}),
    };
  }
}
