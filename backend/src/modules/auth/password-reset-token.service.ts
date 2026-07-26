import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { PasswordResetToken } from './entities/password-reset-token.entity';

export type PasswordResetTokenIssueResult = {
  expiresAt: Date;
  token: string;
};

@Injectable()
export class PasswordResetTokenService {
  private readonly tokenBytes = 32;
  private readonly tokenTtlMinutes = 30;

  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly resetTokenRepository: Repository<PasswordResetToken>,
  ) {}

  async issueToken(
    userId: string,
    createdIp?: string,
  ): Promise<PasswordResetTokenIssueResult> {
    await this.resetTokenRepository.update(
      { userId, usedAt: IsNull() },
      { usedAt: new Date() },
    );

    const token = randomBytes(this.tokenBytes).toString('base64url');
    const expiresAt = new Date(Date.now() + this.tokenTtlMinutes * 60 * 1000);

    await this.resetTokenRepository.save(
      this.resetTokenRepository.create({
        createdIp: createdIp ?? null,
        expiresAt,
        tokenHash: this.hashToken(token),
        userId,
      }),
    );

    return { expiresAt, token };
  }

  async validateToken(rawToken: string): Promise<PasswordResetToken> {
    const tokenHash = this.hashToken(rawToken);
    const resetToken = await this.resetTokenRepository.findOne({
      relations: { user: true },
      where: {
        expiresAt: MoreThan(new Date()),
        tokenHash,
        usedAt: IsNull(),
      },
    });

    if (
      !resetToken ||
      !['active', 'first_login_pending'].includes(resetToken.user.status)
    ) {
      throw new UnauthorizedException(
        'Invalid or expired password reset token',
      );
    }

    return resetToken;
  }

  async consumeToken(resetTokenId: string): Promise<void> {
    const result = await this.resetTokenRepository.update(
      { id: resetTokenId, usedAt: IsNull() },
      { usedAt: new Date() },
    );

    if (!result.affected) {
      throw new UnauthorizedException(
        'Invalid or expired password reset token',
      );
    }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
