import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  isUserAuthenticationStatusAllowed,
  isUserIdentityRoleAssignmentAllowed,
} from '../../common/authz/user-identity-role-policy';
import {
  UserIdentityType,
  userIdentityTypes,
} from '../../common/enums/user-identity-type.enum';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import {
  AuthenticationMethod,
  authenticationMethods,
  SessionAuthenticationContext,
} from './authentication-method';
import { ChangePasswordResponseDto } from './dto/change-password-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { PasswordResetResponseDto } from './dto/password-reset-response.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SessionDto } from './dto/session.dto';
import { PasswordResetTokenService } from './password-reset-token.service';
import {
  PasswordChangeAuditContext,
  PasswordUpdateService,
} from './password-update.service';
import { PasswordService } from './password.service';
import { PmSessionIssuer } from './pm-session-issuer.service';
import { CompatibleJwtPayload } from './interfaces/jwt-payload.interface';
import { JWT_CONFIGURATION } from './jwt-configuration';
import { isTokenCurrentForPasswordState } from './token-password-state';
import type { JwtConfiguration } from './jwt-configuration';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService,
    private readonly passwordResetTokenService: PasswordResetTokenService,
    private readonly passwordUpdateService: PasswordUpdateService,
    private readonly pmSessionIssuer: PmSessionIssuer,
    @Inject(JWT_CONFIGURATION)
    private readonly jwtConfiguration: JwtConfiguration,
  ) {}

  async login(loginDto: LoginDto): Promise<SessionDto> {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!isUserAuthenticationStatusAllowed(user.identityType, user.status)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await this.passwordService.verifyPassword(
      loginDto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    this.validateAuthenticationInvariant(user, 'Invalid credentials');
    const authenticatedAt = Math.floor(Date.now() / 1000);

    await this.usersService.recordLogin(user.id);
    return this.pmSessionIssuer.issue(
      user,
      {
        authenticatedAt,
        authenticationMethod: AuthenticationMethod.Local,
      },
      { requiresPasswordChange: user.status === 'first_login_pending' },
    );
  }

  getMe(userId: string) {
    return this.usersService.getSessionProfile(userId);
  }

  async refresh(refreshToken: string): Promise<SessionDto> {
    let payload: CompatibleJwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<CompatibleJwtPayload>(
        refreshToken,
        {
          algorithms: [this.jwtConfiguration.algorithm],
          audience: this.jwtConfiguration.refreshAudience,
          issuer: this.jwtConfiguration.issuer,
          secret: this.jwtConfiguration.refreshSecret,
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (
      payload.tokenType !== 'refresh' ||
      !payload.iat ||
      !userIdentityTypes.includes(payload.identityType)
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const authenticationContext = this.getAuthenticationContext(payload);
    const user = await this.usersService.findTokenValidationUser(payload.sub);
    if (
      !user ||
      !isUserAuthenticationStatusAllowed(user.identityType, user.status)
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (
      user.roleId !== payload.roleId ||
      user.email !== payload.email ||
      user.identityType !== payload.identityType
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    this.validateAuthenticationInvariant(user, 'Invalid refresh token');
    if (
      !isTokenCurrentForPasswordState(
        payload,
        user.passwordChangedAt,
        user.identityType === UserIdentityType.Service,
      )
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.pmSessionIssuer.issue(user, authenticationContext, {
      requiresPasswordChange: user.status === 'first_login_pending',
    });
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
    auditContext: PasswordChangeAuditContext = {},
  ): Promise<ChangePasswordResponseDto> {
    return this.passwordUpdateService.changeOwnPassword(
      userId,
      changePasswordDto,
      auditContext,
    );
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
    auditContext: PasswordChangeAuditContext = {},
  ): Promise<PasswordResetResponseDto> {
    const user = await this.usersService.findByEmail(forgotPasswordDto.email);
    if (
      user?.identityType === UserIdentityType.Human &&
      isUserAuthenticationStatusAllowed(user.identityType, user.status)
    ) {
      await this.passwordResetTokenService.issueToken(
        user.id,
        auditContext.ipAddress,
      );
    }

    return {
      message:
        'If an account exists for that email, password reset instructions will be sent.',
      success: true,
    };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
    auditContext: PasswordChangeAuditContext = {},
  ): Promise<PasswordResetResponseDto> {
    const resetToken = await this.passwordResetTokenService.validateToken(
      resetPasswordDto.token,
    );

    await this.passwordUpdateService.validateResetPasswordForUser(
      resetToken.userId,
      resetPasswordDto,
    );
    await this.passwordResetTokenService.consumeToken(resetToken.id);
    await this.passwordUpdateService.applyValidatedPasswordReset(
      resetToken.userId,
      resetPasswordDto.newPassword,
      auditContext,
    );

    return {
      message: 'Password reset successfully. Please sign in.',
      success: true,
    };
  }

  private getAuthenticationContext(
    payload: CompatibleJwtPayload,
  ): SessionAuthenticationContext {
    if (
      payload.authenticationMethod !== undefined &&
      authenticationMethods.includes(payload.authenticationMethod) &&
      typeof payload.authenticatedAt === 'number' &&
      Number.isInteger(payload.authenticatedAt) &&
      payload.authenticatedAt >= 0
    ) {
      return {
        authenticatedAt: payload.authenticatedAt,
        authenticationMethod: payload.authenticationMethod,
      };
    }

    if (
      payload.authenticationMethod === undefined &&
      payload.authenticatedAt === undefined &&
      payload.iat
    ) {
      // Pre-Slice 2 tokens have no explicit provenance; their original iat is
      // the only available local authentication boundary during refresh.
      return {
        authenticatedAt: payload.iat,
        authenticationMethod: AuthenticationMethod.Local,
      };
    }

    throw new UnauthorizedException('Invalid refresh token');
  }

  private validateAuthenticationInvariant(
    user: User,
    failureMessage: string,
  ): void {
    if (
      !isUserIdentityRoleAssignmentAllowed(user.identityType, user.role?.name)
    ) {
      throw new UnauthorizedException(failureMessage);
    }
  }
}
