import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExternalIdentityProvider } from '../../../common/enums/external-identity-provider.enum';
import { ExternalIdentity } from '../entities/external-identity.entity';
import { ExternalIdentitiesService } from '../external-identities.service';

type MockRepository = Partial<
  Record<keyof Repository<ExternalIdentity>, jest.Mock>
>;

describe('ExternalIdentitiesService', () => {
  let repository: MockRepository;
  let service: ExternalIdentitiesService;

  beforeEach(async () => {
    repository = {
      create: jest.fn((input: Partial<ExternalIdentity>) =>
        Object.assign(new ExternalIdentity(), input),
      ),
      findOne: jest.fn(),
      save: jest.fn((input: ExternalIdentity) =>
        Promise.resolve(
          Object.assign(new ExternalIdentity(), input, { id: 'identity-1' }),
        ),
      ),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ExternalIdentitiesService,
        {
          provide: getRepositoryToken(ExternalIdentity),
          useValue: repository,
        },
      ],
    }).compile();

    service = moduleRef.get(ExternalIdentitiesService);
  });

  it('finds an identity by issuer and subject', async () => {
    repository.findOne?.mockResolvedValue({ id: 'identity-1' });

    await expect(
      service.findByIssuerAndSubject('https://accounts.example', 'subject-1'),
    ).resolves.toEqual({ id: 'identity-1' });
    expect(repository.findOne).toHaveBeenCalledWith({
      where: {
        issuer: 'https://accounts.example',
        subject: 'subject-1',
      },
    });
  });

  it('finds an identity by user and provider', async () => {
    repository.findOne?.mockResolvedValue({ id: 'identity-1' });

    await expect(
      service.findByUserAndProvider('user-1', ExternalIdentityProvider.Google),
    ).resolves.toEqual({ id: 'identity-1' });
    expect(repository.findOne).toHaveBeenCalledWith({
      where: {
        provider: ExternalIdentityProvider.Google,
        userId: 'user-1',
      },
    });
  });

  it('creates an external identity with authentication metadata', async () => {
    const lastAuthenticatedAt = new Date('2026-09-04T10:00:00.000Z');

    await expect(
      service.create({
        emailAtLastAuthentication: 'user@example.com',
        issuer: 'https://accounts.example',
        lastAuthenticatedAt,
        provider: ExternalIdentityProvider.Google,
        subject: 'subject-1',
        userId: 'user-1',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'identity-1',
        lastAuthenticatedAt,
      }),
    );
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        emailAtLastAuthentication: 'user@example.com',
        issuer: 'https://accounts.example',
        lastAuthenticatedAt,
        provider: ExternalIdentityProvider.Google,
        subject: 'subject-1',
        userId: 'user-1',
      }),
    );
  });

  it('updates the last authenticated timestamp and observed email', async () => {
    const lastAuthenticatedAt = new Date('2026-09-04T11:00:00.000Z');

    await service.updateAuthenticationMetadata(
      'identity-1',
      'updated@example.com',
      lastAuthenticatedAt,
    );

    expect(repository.update).toHaveBeenCalledWith(
      { id: 'identity-1' },
      {
        emailAtLastAuthentication: 'updated@example.com',
        lastAuthenticatedAt,
      },
    );
  });

  it('rejects metadata updates for a missing identity', async () => {
    repository.update?.mockResolvedValue({ affected: 0 });

    await expect(
      service.updateAuthenticationMetadata(
        'missing-identity',
        'user@example.com',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
