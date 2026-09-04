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
import { JwtPayload } from './interfaces/jwt-payload.interface';
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

    await this.usersService.recordLogin(user.id);
    return this.issueSession(user, {
      requiresPasswordChange: user.status === 'first_login_pending',
    });
  }

  getMe(userId: string) {
    return this.usersService.getSessionProfile(userId);
  }

  async refresh(refreshToken: string): Promise<SessionDto> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        algorithms: [this.jwtConfiguration.algorithm],
        audience: this.jwtConfiguration.refreshAudience,
        issuer: this.jwtConfiguration.issuer,
        secret: this.jwtConfiguration.refreshSecret,
      });
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

    return this.issueSession(user, {
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

  private issueSession(
    user: Pick<
      User,
      'email' | 'id' | 'identityType' | 'passwordChangedAt' | 'roleId'
    >,
    options: { requiresPasswordChange?: boolean } = {},
  ): SessionDto {
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        identityType: user.identityType,
        passwordChangedAt: user.passwordChangedAt?.toISOString() ?? null,
        roleId: user.roleId,
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
        sub: user.id,
        email: user.email,
        identityType: user.identityType,
        passwordChangedAt: user.passwordChangedAt?.toISOString() ?? null,
        roleId: user.roleId,
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
