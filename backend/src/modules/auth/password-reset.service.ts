import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { PasswordResetResponseDto } from './dto/password-reset-response.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import {
  PasswordChangeAuditContext,
  PasswordUpdateService,
} from './password-update.service';
import { PasswordResetEmailService } from './password-reset-email.service';

type PasswordResetAuditContext = PasswordChangeAuditContext & {
  ipAddress?: string;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const forgotPasswordSuccessMessage =
  'If an account exists, a password reset email has been sent.';
const invalidResetTokenMessage =
  'This password reset link is invalid or has expired.';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  private readonly rateLimitWindowMs = Number(
    process.env.PASSWORD_RESET_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000,
  );
  private readonly rateLimitMaxRequests = Number(
    process.env.PASSWORD_RESET_RATE_LIMIT_MAX ?? 5,
  );
  private readonly requestBuckets = new Map<string, RateLimitBucket>();
  private readonly resetTokenTtlMinutes = Number(
    process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES ?? 60,
  );

  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly resetTokensRepository: Repository<PasswordResetToken>,
    private readonly usersService: UsersService,
    private readonly passwordUpdateService: PasswordUpdateService,
    private readonly passwordResetEmailService: PasswordResetEmailService,
  ) {}

  async requestPasswordReset(
    forgotPasswordDto: ForgotPasswordDto,
    auditContext: PasswordResetAuditContext = {},
  ): Promise<PasswordResetResponseDto> {
    const email = this.normalizeEmail(forgotPasswordDto.email);
    this.enforceRateLimit(`email:${email}`);
    this.enforceRateLimit(`ip:${auditContext.ipAddress ?? 'unknown'}`);

    const user = await this.usersService.findByEmail(email);
    if (user?.status === 'active') {
      const rawToken = this.generateToken();
      const tokenHash = this.hashToken(rawToken);
      const expiresAt = new Date(
        Date.now() + this.resetTokenTtlMinutes * 60 * 1000,
      );

      await this.invalidateOutstandingTokens(user.id);
      await this.resetTokensRepository.save(
        this.resetTokensRepository.create({
          createdIp: auditContext.ipAddress,
          expiresAt,
          tokenHash,
          userId: user.id,
        }),
      );
      await this.passwordResetEmailService.sendPasswordResetEmail({
        email: user.email,
        expiresAt,
        resetUrl: this.buildResetUrl(rawToken),
      });
    }

    this.logger.log({
      email,
      event: 'PasswordResetRequested',
      ipAddress: auditContext.ipAddress,
      timestamp: new Date().toISOString(),
    });

    return {
      message: forgotPasswordSuccessMessage,
      success: true,
    };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
    auditContext: PasswordResetAuditContext = {},
  ): Promise<PasswordResetResponseDto> {
    if (resetPasswordDto.newPassword !== resetPasswordDto.confirmPassword) {
      throw new BadRequestException('Password confirmation does not match');
    }

    const tokenHash = this.hashToken(resetPasswordDto.token);
    const resetToken = await this.resetTokensRepository.findOne({
      relations: { user: true },
      where: { tokenHash },
    });
    if (
      !resetToken ||
      !this.isTokenHashMatch(tokenHash, resetToken.tokenHash)
    ) {
      throw new BadRequestException(invalidResetTokenMessage);
    }

    const now = new Date();
    if (
      resetToken.usedAt ||
      resetToken.expiresAt.getTime() <= now.getTime() ||
      resetToken.user?.status !== 'active'
    ) {
      throw new BadRequestException(invalidResetTokenMessage);
    }

    await this.passwordUpdateService.resetPasswordForUser(
      resetToken.userId,
      {
        confirmPassword: resetPasswordDto.confirmPassword,
        newPassword: resetPasswordDto.newPassword,
      },
      auditContext,
    );

    await this.resetTokensRepository.update(
      { id: resetToken.id },
      { usedAt: now },
    );
    await this.invalidateOutstandingTokens(resetToken.userId, now);
    this.logger.log({
      event: 'PasswordResetCompleted',
      ipAddress: auditContext.ipAddress,
      timestamp: now.toISOString(),
      userAgent: auditContext.userAgent,
      userId: resetToken.userId,
    });

    return {
      message: 'Password reset successfully. Please sign in.',
      success: true,
    };
  }

  private generateToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private isTokenHashMatch(inputHash: string, storedHash: string): boolean {
    const inputBuffer = Buffer.from(inputHash, 'hex');
    const storedBuffer = Buffer.from(storedHash, 'hex');
    return (
      inputBuffer.length === storedBuffer.length &&
      timingSafeEqual(inputBuffer, storedBuffer)
    );
  }

  private buildResetUrl(token: string): string {
    const frontendUrl =
      process.env.PASSWORD_RESET_FRONTEND_URL ??
      process.env.FRONTEND_URL ??
      'http://localhost:3000';
    const url = new URL('/reset-password', frontendUrl);
    url.searchParams.set('token', token);
    return url.toString();
  }

  private invalidateOutstandingTokens(userId: string, usedAt = new Date()) {
    return this.resetTokensRepository.update(
      {
        expiresAt: MoreThan(usedAt),
        usedAt: IsNull(),
        userId,
      },
      { usedAt },
    );
  }

  private enforceRateLimit(key: string): void {
    const now = Date.now();
    const bucket = this.requestBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.requestBuckets.set(key, {
        count: 1,
        resetAt: now + this.rateLimitWindowMs,
      });
      return;
    }

    if (bucket.count >= this.rateLimitMaxRequests) {
      throw new HttpException(
        'Too many password reset requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    bucket.count += 1;
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
