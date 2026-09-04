import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExternalIdentityProvider } from '../../common/enums/external-identity-provider.enum';
import { ExternalIdentity } from './entities/external-identity.entity';

export type CreateExternalIdentityInput = {
  emailAtLastAuthentication: string;
  issuer: string;
  lastAuthenticatedAt?: Date;
  provider: ExternalIdentityProvider;
  subject: string;
  userId: string;
};

@Injectable()
export class ExternalIdentitiesService {
  constructor(
    @InjectRepository(ExternalIdentity)
    private readonly externalIdentitiesRepository: Repository<ExternalIdentity>,
  ) {}

  findByIssuerAndSubject(
    issuer: string,
    subject: string,
  ): Promise<ExternalIdentity | null> {
    return this.externalIdentitiesRepository.findOne({
      where: { issuer, subject },
    });
  }

  findByUserAndProvider(
    userId: string,
    provider: ExternalIdentityProvider,
  ): Promise<ExternalIdentity | null> {
    return this.externalIdentitiesRepository.findOne({
      where: { provider, userId },
    });
  }

  create(input: CreateExternalIdentityInput): Promise<ExternalIdentity> {
    return this.externalIdentitiesRepository.save(
      this.externalIdentitiesRepository.create({
        ...input,
        lastAuthenticatedAt: input.lastAuthenticatedAt ?? new Date(),
      }),
    );
  }

  async updateAuthenticationMetadata(
    id: string,
    emailAtLastAuthentication: string,
    lastAuthenticatedAt = new Date(),
  ): Promise<void> {
    const result = await this.externalIdentitiesRepository.update(
      { id },
      { emailAtLastAuthentication, lastAuthenticatedAt },
    );
    if (!result.affected) {
      throw new NotFoundException(`External identity ${id} not found`);
    }
  }
}
