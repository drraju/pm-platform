import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { UserIdentityType } from '../../common/enums/user-identity-type.enum';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { UsersService } from '../users/users.service';
import type { UserAdministrationActor } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangePasswordResponseDto } from './dto/change-password-response.dto';
import { PasswordPolicyService } from './password-policy.service';
import { PasswordService } from './password.service';

export type PasswordChangeAuditContext = {
  ipAddress?: string;
  userAgent?: string;
};

export type ResetPasswordInput = {
  confirmPassword: string;
  newPassword: string;
};

@Injectable()
export class PasswordUpdateService {
  private readonly logger = new Logger(PasswordUpdateService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly passwordPolicyService: PasswordPolicyService,
  ) {}

  async changeOwnPassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
    auditContext: PasswordChangeAuditContext = {},
  ): Promise<ChangePasswordResponseDto> {
    if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
      throw new BadRequestException('Password confirmation does not match');
    }

    this.validateNewPassword(changePasswordDto.newPassword);

    const user = await this.usersService.findAuthenticationUserById(userId);
    if (!user) {
      throw new UnauthorizedException('Unable to change password');
    }
    if (user.identityType === UserIdentityType.Service) {
      throw new UnauthorizedException('Unable to change password');
    }

    const currentPasswordMatches = await this.passwordService.verifyPassword(
      changePasswordDto.currentPassword,
      user.passwordHash,
    );
    if (!currentPasswordMatches) {
      throw new UnauthorizedException('Unable to change password');
    }

    const newPasswordMatchesCurrent = await this.passwordService.verifyPassword(
      changePasswordDto.newPassword,
      user.passwordHash,
    );
    if (newPasswordMatchesCurrent) {
      throw new BadRequestException(
        'New password must differ from current password',
      );
    }

    const passwordHash = await this.passwordService.hashPassword(
      changePasswordDto.newPassword,
    );
    await this.usersService.updatePassword(
      userId,
      passwordHash,
      new Date(),
      'active',
    );
    this.recordPasswordChangeAudit(userId, auditContext);

    return {
      success: true,
      message: 'Password changed successfully. Please sign in again.',
      requiresLogin: true,
    };
  }

  async resetPasswordForUser(
    userId: string,
    resetPasswordInput: ResetPasswordInput,
    auditContext: PasswordChangeAuditContext = {},
  ): Promise<void> {
    await this.validateResetPasswordForUser(userId, resetPasswordInput);
    await this.applyValidatedPasswordReset(
      userId,
      resetPasswordInput.newPassword,
      auditContext,
    );
  }

  async validateResetPasswordForUser(
    userId: string,
    resetPasswordInput: ResetPasswordInput,
  ): Promise<User> {
    if (resetPasswordInput.newPassword !== resetPasswordInput.confirmPassword) {
      throw new BadRequestException('Password confirmation does not match');
    }

    this.validateNewPassword(resetPasswordInput.newPassword);

    const user = await this.usersService.findAuthenticationUserById(userId);
    if (!user) {
      throw new UnauthorizedException('Unable to reset password');
    }
    if (user.identityType === UserIdentityType.Service) {
      throw new UnauthorizedException('Unable to reset password');
    }

    const newPasswordMatchesCurrent = await this.passwordService.verifyPassword(
      resetPasswordInput.newPassword,
      user.passwordHash,
    );
    if (newPasswordMatchesCurrent) {
      throw new BadRequestException(
        'New password must differ from current password',
      );
    }

    return user;
  }

  async applyValidatedPasswordReset(
    userId: string,
    newPassword: string,
    auditContext: PasswordChangeAuditContext = {},
  ): Promise<void> {
    const passwordHash = await this.passwordService.hashPassword(newPassword);
    await this.usersService.updatePassword(
      userId,
      passwordHash,
      new Date(),
      'active',
    );
    this.recordPasswordChangeAudit(userId, {
      ...auditContext,
      event: 'PasswordResetPasswordChanged',
    });
  }

  async adminResetPassword(
    userId: string,
    temporaryPassword: string,
    auditContext: PasswordChangeAuditContext = {},
  ): Promise<void> {
    this.validateNewPassword(temporaryPassword);

    const user = await this.usersService.findAuthenticationUserById(userId);
    if (!user || user.identityType === UserIdentityType.Service) {
      throw new UnauthorizedException('Unable to reset password');
    }

    const passwordHash =
      await this.passwordService.hashPassword(temporaryPassword);
    await this.usersService.updatePassword(
      userId,
      passwordHash,
      new Date(),
      'first_login_pending',
    );
    this.recordPasswordChangeAudit(userId, {
      ...auditContext,
      event: 'PasswordResetByAdministrator',
    });
  }

  async hashTemporaryPassword(temporaryPassword: string): Promise<string> {
    this.validateNewPassword(temporaryPassword);
    return this.passwordService.hashPassword(temporaryPassword);
  }

  async rotateServiceAccountCredentials(
    userId: string,
    newPassword: string,
    actor: UserAdministrationActor,
    auditContext: PasswordChangeAuditContext = {},
  ): Promise<UserResponseDto> {
    this.validateNewPassword(newPassword);
    const user = await this.usersService.findServiceAccountAuthenticationUser(
      userId,
      actor,
    );
    if (
      await this.passwordService.verifyPassword(newPassword, user.passwordHash)
    ) {
      throw new BadRequestException(
        'New password must differ from current password',
      );
    }

    const passwordHash = await this.passwordService.hashPassword(newPassword);
    const response =
      await this.usersService.persistServiceAccountCredentialRotation(
        userId,
        passwordHash,
        new Date(),
        actor,
      );
    this.recordPasswordChangeAudit(userId, {
      ...auditContext,
      event: 'ServiceAccountCredentialsRotated',
    });
    return response;
  }

  private validateNewPassword(password: string): void {
    const result = this.passwordPolicyService.validate(password);
    if (!result.valid) {
      throw new BadRequestException(result.errors);
    }
  }

  private recordPasswordChangeAudit(
    userId: string,
    auditContext: PasswordChangeAuditContext & { event?: string },
  ) {
    this.logger.log({
      event: auditContext.event ?? 'PasswordChanged',
      ipAddress: auditContext.ipAddress,
      timestamp: new Date().toISOString(),
      userAgent: auditContext.userAgent,
      userId,
    });
  }

  /*
   * Future password workflows should be added here so resetPassword,
   * adminResetPassword, and forcePasswordChange reuse the same policy,
   * hashing, persistence, timestamp, and audit boundaries.
   */
}
