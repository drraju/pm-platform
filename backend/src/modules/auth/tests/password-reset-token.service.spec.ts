import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { PasswordResetTokenService } from '../password-reset-token.service';

type PasswordResetTokenDraft = Partial<PasswordResetToken>;
type ResetTokenRepositoryMock = {
  create: jest.Mock<PasswordResetTokenDraft, [PasswordResetTokenDraft]>;
  findOne: jest.Mock;
  save: jest.Mock<Promise<PasswordResetTokenDraft>, [PasswordResetTokenDraft]>;
  update: jest.Mock;
};

describe('PasswordResetTokenService', () => {
  let repository: ResetTokenRepositoryMock;
  let savedToken: PasswordResetTokenDraft | null;
  let service: PasswordResetTokenService;

  beforeEach(async () => {
    savedToken = null;
    repository = {
      create: jest.fn((entity) => entity),
      findOne: jest.fn(),
      save: jest.fn((entity) => {
        savedToken = entity;
        return Promise.resolve(entity);
      }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PasswordResetTokenService,
        {
          provide: getRepositoryToken(PasswordResetToken),
          useValue: repository,
        },
      ],
    }).compile();

    service = moduleRef.get(PasswordResetTokenService);
  });

  it('stores only a hashed reset token', async () => {
    const result = await service.issueToken('user-1', '127.0.0.1');

    expect(result.token).toEqual(expect.any(String));
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        createdIp: '127.0.0.1',
        userId: 'user-1',
      }),
    );
    expect(savedToken?.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(savedToken?.tokenHash).not.toBe(result.token);
  });

  it('returns active-user tokens that are unused and unexpired', async () => {
    repository.findOne.mockResolvedValue({
      id: 'token-1',
      user: { status: 'active' },
      userId: 'user-1',
    });

    await expect(service.validateToken('raw-token')).resolves.toEqual({
      id: 'token-1',
      user: { status: 'active' },
      userId: 'user-1',
    });
  });

  it('rejects missing, expired, used, or disabled-user tokens', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.validateToken('raw-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    repository.findOne.mockResolvedValue({
      id: 'token-1',
      user: { status: 'disabled' },
      userId: 'user-1',
    });

    await expect(service.validateToken('raw-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects token reuse when consumption has already occurred', async () => {
    repository.update.mockResolvedValue({ affected: 0 });

    await expect(service.consumeToken('token-1')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
