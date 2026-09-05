import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import {
  isUserAuthenticationStatusAllowed,
  isUserIdentityRoleAssignmentAllowed,
} from '../../common/authz/user-identity-role-policy';
import { ExternalIdentityProvider } from '../../common/enums/external-identity-provider.enum';
import { UserIdentityType } from '../../common/enums/user-identity-type.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { ExternalIdentity } from './entities/external-identity.entity';
import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';

export type GoogleIdentityLinkingInput = {
  firstName: string | null;
  issuer: string;
  lastName: string | null;
  normalizedEmail: string;
  subject: string;
};

export type GoogleIdentityLinkingResult = {
  principal: Pick<
    User,
    'email' | 'id' | 'identityType' | 'passwordChangedAt' | 'roleId'
  >;
  status: string;
};

export class GoogleIdentityLinkingRejectedError extends Error {
  constructor() {
    super('Google identity is not eligible for PM authentication');
    this.name = GoogleIdentityLinkingRejectedError.name;
  }
}

export class GoogleIdentityLinkingPersistenceError extends Error {
  constructor(cause?: unknown) {
    super('Google identity persistence failed', { cause });
    this.name = GoogleIdentityLinkingPersistenceError.name;
  }
}

@Injectable()
export class GoogleIdentityLinkingService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async resolveAndRecordAuthentication(
    input: GoogleIdentityLinkingInput,
  ): Promise<GoogleIdentityLinkingResult> {
    try {
      return await this.usersRepository.manager.transaction((manager) =>
        this.resolveInTransaction(manager, input),
      );
    } catch (error) {
      if (
        error instanceof GoogleIdentityLinkingRejectedError ||
        error instanceof GoogleIdentityLinkingPersistenceError
      ) {
        throw error;
      }
      throw new GoogleIdentityLinkingPersistenceError(error);
    }
  }

  private async resolveInTransaction(
    manager: EntityManager,
    input: GoogleIdentityLinkingInput,
  ): Promise<GoogleIdentityLinkingResult> {
    const authenticatedAt = new Date();
    const existingIdentity = await this.findByIssuerAndSubject(
      manager,
      input.issuer,
      input.subject,
    );

    if (existingIdentity) {
      const user = await this.ensureEligibleHuman(
        manager,
        await this.findUserByIdForUpdate(manager, existingIdentity.userId),
      );

      const currentIdentity = await this.findByIssuerAndSubject(
        manager,
        input.issuer,
        input.subject,
      );
      if (
        !currentIdentity ||
        currentIdentity.id !== existingIdentity.id ||
        currentIdentity.userId !== user.id
      ) {
        throw new GoogleIdentityLinkingPersistenceError();
      }

      await this.recordSuccessfulAuthentication(
        manager,
        user,
        currentIdentity,
        authenticatedAt,
        input.normalizedEmail,
      );
      return this.resultFrom(user);
    }

    const existingUser = await this.findUserByNormalizedEmailForUpdate(
      manager,
      input.normalizedEmail,
    );
    const user = await this.ensureEligibleHuman(
      manager,
      existingUser ??
        (await this.provisionOrReconcileUser(manager, input, authenticatedAt)),
    );

    let identity = await this.reconcileMappings(manager, user, input);
    if (!identity) {
      await manager
        .createQueryBuilder()
        .insert()
        .into(ExternalIdentity)
        .values({
          emailAtLastAuthentication: input.normalizedEmail,
          issuer: input.issuer,
          lastAuthenticatedAt: authenticatedAt,
          provider: ExternalIdentityProvider.Google,
          subject: input.subject,
          userId: user.id,
        })
        .orIgnore()
        .execute();

      identity = await this.reconcileMappings(manager, user, input, true);
    }
    if (!identity) {
      throw new GoogleIdentityLinkingPersistenceError();
    }

    await this.recordSuccessfulAuthentication(
      manager,
      user,
      identity,
      authenticatedAt,
      input.normalizedEmail,
    );
    return this.resultFrom(user);
  }

  private async reconcileMappings(
    manager: EntityManager,
    user: User,
    input: GoogleIdentityLinkingInput,
    requireMapping = false,
  ): Promise<ExternalIdentity | null> {
    const byIssuerAndSubject = await this.findByIssuerAndSubject(
      manager,
      input.issuer,
      input.subject,
    );
    const byUserAndProvider = await manager.findOne(ExternalIdentity, {
      where: {
        provider: ExternalIdentityProvider.Google,
        userId: user.id,
      },
    });

    if (!byIssuerAndSubject && !byUserAndProvider) {
      if (requireMapping) {
        throw new GoogleIdentityLinkingPersistenceError();
      }
      return null;
    }

    const expectedMapping = (identity: ExternalIdentity | null) =>
      identity?.issuer === input.issuer &&
      identity.subject === input.subject &&
      identity.userId === user.id &&
      identity.provider === ExternalIdentityProvider.Google;

    if (
      !expectedMapping(byIssuerAndSubject) ||
      !expectedMapping(byUserAndProvider) ||
      byIssuerAndSubject?.id !== byUserAndProvider?.id
    ) {
      throw new GoogleIdentityLinkingRejectedError();
    }

    return byIssuerAndSubject;
  }

  private findByIssuerAndSubject(
    manager: EntityManager,
    issuer: string,
    subject: string,
  ): Promise<ExternalIdentity | null> {
    return manager.findOne(ExternalIdentity, {
      where: { issuer, subject },
    });
  }

  private findUserByIdForUpdate(
    manager: EntityManager,
    id: string,
  ): Promise<User | null> {
    return manager.findOne(User, {
      lock: { mode: 'pessimistic_write' },
      select: {
        email: true,
        id: true,
        identityType: true,
        passwordChangedAt: true,
        roleId: true,
        status: true,
      },
      where: { id },
    });
  }

  private findUserByNormalizedEmailForUpdate(
    manager: EntityManager,
    normalizedEmail: string,
  ): Promise<User | null> {
    return manager
      .createQueryBuilder(User, 'user')
      .select([
        'user.email',
        'user.id',
        'user.identityType',
        'user.passwordChangedAt',
        'user.roleId',
        'user.status',
      ])
      .where('lower(user.email) = :normalizedEmail', { normalizedEmail })
      .setLock('pessimistic_write')
      .getOne();
  }

  private async provisionOrReconcileUser(
    manager: EntityManager,
    input: GoogleIdentityLinkingInput,
    authenticatedAt: Date,
  ): Promise<User> {
    const role = await manager.findOne(Role, {
      select: { id: true, name: true },
      where: { name: UserRole.TeamMember },
    });
    if (
      !role ||
      !isUserIdentityRoleAssignmentAllowed(UserIdentityType.Human, role.name)
    ) {
      throw new GoogleIdentityLinkingPersistenceError();
    }

    await manager
      .createQueryBuilder()
      .insert()
      .into(User)
      .values({
        accountHistory: [],
        email: input.normalizedEmail,
        firstName: input.firstName,
        identityType: UserIdentityType.Human,
        lastLoginAt: authenticatedAt,
        lastName: input.lastName,
        passwordChangedAt: null,
        passwordHash: null,
        roleId: role.id,
        status: 'active',
      })
      .orIgnore()
      .execute();

    const user = await this.findUserByNormalizedEmailForUpdate(
      manager,
      input.normalizedEmail,
    );
    if (!user) {
      throw new GoogleIdentityLinkingPersistenceError();
    }
    return user;
  }

  private async ensureEligibleHuman(
    manager: EntityManager,
    user: User | null,
  ): Promise<User> {
    if (
      !user ||
      user.identityType !== UserIdentityType.Human ||
      !isUserAuthenticationStatusAllowed(user.identityType, user.status)
    ) {
      throw new GoogleIdentityLinkingRejectedError();
    }

    const role = await manager.findOne(Role, {
      select: { name: true },
      where: { id: user.roleId },
    });
    if (
      !role ||
      !isUserIdentityRoleAssignmentAllowed(user.identityType, role.name)
    ) {
      throw new GoogleIdentityLinkingRejectedError();
    }
    return user;
  }

  private async recordSuccessfulAuthentication(
    manager: EntityManager,
    user: User,
    identity: ExternalIdentity,
    authenticatedAt: Date,
    normalizedEmail: string,
  ): Promise<void> {
    const identityUpdate = await manager.update(
      ExternalIdentity,
      { id: identity.id },
      {
        emailAtLastAuthentication: normalizedEmail,
        lastAuthenticatedAt: authenticatedAt,
      },
    );
    const userUpdate = await manager.update(
      User,
      { id: user.id },
      { lastLoginAt: authenticatedAt },
    );
    if (!identityUpdate.affected || !userUpdate.affected) {
      throw new GoogleIdentityLinkingPersistenceError();
    }
  }

  private resultFrom(user: User): GoogleIdentityLinkingResult {
    return {
      principal: {
        email: user.email,
        id: user.id,
        identityType: user.identityType,
        passwordChangedAt: user.passwordChangedAt,
        roleId: user.roleId,
      },
      status: user.status,
    };
  }
}
