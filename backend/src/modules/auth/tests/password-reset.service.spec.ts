import { BadRequestException, HttpException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PasswordResetEmailService } from '../password-reset-email.service';
import { PasswordResetService } from '../password-reset.service';
import { PasswordUpdateService } from '../password-update.service';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { UsersService } from '../../users/users.service';

type StoredResetToken = PasswordResetToken & {
  user?: { email: string; id: string; status: string };
};

describe('PasswordResetService', () => {
  let emailService: Pick<PasswordResetEmailService, 'sendPasswordResetEmail'>;
  let passwordUpdateService: Pick<
    PasswordUpdateService,
    'resetPasswordForUser'
  >;
  let resetTokens: StoredResetToken[];
  let resetTokensRepository: {
    create: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
  let service: PasswordResetService;
  let usersService: Pick<UsersService, 'findByEmail'>;

  beforeEach(() => {
    jest.useRealTimers();
    resetTokens = [];
    usersService = {
      findByEmail: jest.fn(),
    };
    passwordUpdateService = {
      resetPasswordForUser: jest.fn(),
    };
    emailService = {
      sendPasswordResetEmail: jest.fn(),
    };
    resetTokensRepository = {
      create: jest.fn((input: Partial<PasswordResetToken>) => input),
      findOne: jest.fn(({ where }: { where: { tokenHash: string } }) => {
        const token = resetTokens.find(
          (candidate) => candidate.tokenHash === where.tokenHash,
        );
        return Promise.resolve(token ?? null);
      }),
      save: jest.fn((input: Partial<PasswordResetToken>) => {
        const token = {
          ...input,
          id: `reset-token-${resetTokens.length + 1}`,
          user: {
            email: 'user@example.com',
            id: input.userId ?? 'user-1',
            status: 'active',
          },
        } as StoredResetToken;
        resetTokens.push(token);
        return Promise.resolve(token);
      }),
      update: jest.fn(
        (
          criteria: { id?: string; userId?: string },
          update: { usedAt: Date },
        ) => {
          resetTokens
            .filter((token) =>
              criteria.id
                ? token.id === criteria.id
                : token.userId === criteria.userId && !token.usedAt,
            )
            .forEach((token) => {
              token.usedAt = update.usedAt;
            });
          return Promise.resolve({ affected: 1 });
        },
      ),
    };

    process.env.PASSWORD_RESET_RATE_LIMIT_MAX = '2';
    process.env.PASSWORD_RESET_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.PASSWORD_RESET_FRONTEND_URL = 'https://pm.example.com';

    service = new PasswordResetService(
      resetTokensRepository as never,
      usersService as UsersService,
      passwordUpdateService as PasswordUpdateService,
      emailService as PasswordResetEmailService,
    );
  });

  afterEach(() => {
    delete process.env.PASSWORD_RESET_RATE_LIMIT_MAX;
    delete process.env.PASSWORD_RESET_RATE_LIMIT_WINDOW_MS;
    delete process.env.PASSWORD_RESET_FRONTEND_URL;
  });

  it('returns the same forgot-password response for existing and unknown accounts', async () => {
    (usersService.findByEmail as jest.Mock).mockResolvedValueOnce(null);

    await expect(
      service.requestPasswordReset({ email: 'missing@example.com' }),
    ).resolves.toEqual({
      message: 'If an account exists, a password reset email has been sent.',
      success: true,
    });
    expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();

    (usersService.findByEmail as jest.Mock).mockResolvedValueOnce({
      email: 'user@example.com',
      id: 'user-1',
      status: 'active',
    });
    await expect(
      service.requestPasswordReset({ email: 'user@example.com' }),
    ).resolves.toEqual({
      message: 'If an account exists, a password reset email has been sent.',
      success: true,
    });
    expect(emailService.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
  });

  it('stores only the token hash and sends only the raw token in the reset link', async () => {
    (usersService.findByEmail as jest.Mock).mockResolvedValue({
      email: 'user@example.com',
      id: 'user-1',
      status: 'active',
    });

    await service.requestPasswordReset({ email: 'User@Example.com ' });

    const savedToken = resetTokens[0];
    const [emailInput] = (emailService.sendPasswordResetEmail as jest.Mock).mock
      .calls[0] as [{ resetUrl: string }];
    const rawToken = new URL(emailInput.resetUrl).searchParams.get('token');

    expect(rawToken).toBeTruthy();
    expect(savedToken.tokenHash).toHaveLength(64);
    expect(savedToken.tokenHash).not.toBe(rawToken);
    expect(savedToken.tokenHash).toBe(
      createHash('sha256')
        .update(rawToken ?? '')
        .digest('hex'),
    );
    expect(emailInput.resetUrl).toMatch(/^https:\/\/pm\.example\.com/);
  });

  it('resets through PasswordUpdateService, marks the token used, and rejects replay', async () => {
    (usersService.findByEmail as jest.Mock).mockResolvedValue({
      email: 'user@example.com',
      id: 'user-1',
      status: 'active',
    });
    await service.requestPasswordReset({ email: 'user@example.com' });
    const [emailInput] = (emailService.sendPasswordResetEmail as jest.Mock).mock
      .calls[0] as [{ resetUrl: string }];
    const rawToken =
      new URL(emailInput.resetUrl).searchParams.get('token') ?? '';

    await expect(
      service.resetPassword({
        confirmPassword: 'NewPass1!',
        newPassword: 'NewPass1!',
        token: rawToken,
      }),
    ).resolves.toEqual({
      message: 'Password reset successfully. Please sign in.',
      success: true,
    });
    expect(passwordUpdateService.resetPasswordForUser).toHaveBeenCalledWith(
      'user-1',
      { confirmPassword: 'NewPass1!', newPassword: 'NewPass1!' },
      {},
    );
    expect(resetTokens[0].usedAt).toBeInstanceOf(Date);

    await expect(
      service.resetPassword({
        confirmPassword: 'NewPass1!',
        newPassword: 'NewPass1!',
        token: rawToken,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects expired and unknown tokens with a generic reset error', async () => {
    resetTokens.push({
      expiresAt: new Date(Date.now() - 1000),
      id: 'reset-token-expired',
      tokenHash: createHash('sha256').update('expired-token').digest('hex'),
      user: { email: 'user@example.com', id: 'user-1', status: 'active' },
      userId: 'user-1',
    } as StoredResetToken);

    await expect(
      service.resetPassword({
        confirmPassword: 'NewPass1!',
        newPassword: 'NewPass1!',
        token: 'expired-token',
      }),
    ).rejects.toThrow('This password reset link is invalid or has expired.');

    await expect(
      service.resetPassword({
        confirmPassword: 'NewPass1!',
        newPassword: 'NewPass1!',
        token: 'unknown-token',
      }),
    ).rejects.toThrow('This password reset link is invalid or has expired.');
  });

  it('enforces rate limits by email and IP before account lookup', async () => {
    (usersService.findByEmail as jest.Mock).mockResolvedValue(null);

    await service.requestPasswordReset(
      { email: 'rate@example.com' },
      { ipAddress: '203.0.113.10' },
    );
    await service.requestPasswordReset(
      { email: 'rate@example.com' },
      { ipAddress: '203.0.113.10' },
    );

    await expect(
      service.requestPasswordReset(
        { email: 'rate@example.com' },
        { ipAddress: '203.0.113.10' },
      ),
    ).rejects.toBeInstanceOf(HttpException);
  });
});
