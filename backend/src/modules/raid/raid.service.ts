import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RaidType } from '../../common/enums/raid-type.enum';
import {
  AuthenticatedPrincipal,
  AuthorizationService,
} from '../authorization/authorization.service';
import { PermissionKey } from '../authorization/permissions';
import { CreateRaidItemDto } from './dto/create-raid-item.dto';
import { Assumption } from './entities/assumption.entity';
import { Dependency } from './entities/dependency.entity';
import { Issue } from './entities/issue.entity';
import { Risk } from './entities/risk.entity';

@Injectable()
export class RaidService {
  constructor(
    @InjectRepository(Risk)
    private readonly risksRepository: Repository<Risk>,
    @InjectRepository(Issue)
    private readonly issuesRepository: Repository<Issue>,
    @InjectRepository(Assumption)
    private readonly assumptionsRepository: Repository<Assumption>,
    @InjectRepository(Dependency)
    private readonly dependenciesRepository: Repository<Dependency>,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async findAll() {
    const relations = { project: true, owner: true };
    const [risks, issues, assumptions, dependencies] = await Promise.all([
      this.risksRepository.find({ relations }),
      this.issuesRepository.find({ relations }),
      this.assumptionsRepository.find({ relations }),
      this.dependenciesRepository.find({ relations }),
    ]);

    return [...risks, ...issues, ...assumptions, ...dependencies].sort(
      (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
    );
  }

  async findAllForUser(principal: AuthenticatedPrincipal) {
    const user = await this.authorizationService.getEffectiveUser(
      principal.userId,
    );
    const accessibleProjectIds =
      await this.authorizationService.getAccessibleProjectIds(user);
    if (accessibleProjectIds?.length === 0) {
      return [];
    }

    if (
      accessibleProjectIds === null ||
      this.authorizationService.hasPermission(user, PermissionKey.RaidReadAll)
    ) {
      return this.findAll();
    }

    const relations = { project: true, owner: true };
    const where = { projectId: In(accessibleProjectIds) };
    const [risks, issues, assumptions, dependencies] = await Promise.all([
      this.risksRepository.find({ relations, where }),
      this.issuesRepository.find({ relations, where }),
      this.assumptionsRepository.find({ relations, where }),
      this.dependenciesRepository.find({ relations, where }),
    ]);

    return [...risks, ...issues, ...assumptions, ...dependencies].sort(
      (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
    );
  }

  create(createRaidItemDto: CreateRaidItemDto) {
    switch (createRaidItemDto.type) {
      case RaidType.Risk:
        return this.risksRepository.save(
          this.risksRepository.create(createRaidItemDto),
        );
      case RaidType.Issue:
        return this.issuesRepository.save(
          this.issuesRepository.create(createRaidItemDto),
        );
      case RaidType.Assumption:
        return this.assumptionsRepository.save(
          this.assumptionsRepository.create(createRaidItemDto),
        );
      case RaidType.Dependency:
        return this.dependenciesRepository.save(
          this.dependenciesRepository.create(createRaidItemDto),
        );
    }
  }

  async createForUser(
    principal: AuthenticatedPrincipal,
    createRaidItemDto: CreateRaidItemDto,
  ) {
    const user = await this.authorizationService.getEffectiveUser(
      principal.userId,
    );
    this.authorizationService.assertHasAnyPermission(user, [
      PermissionKey.RaidCreate,
    ]);
    await this.authorizationService.assertCanReadProject(
      user,
      createRaidItemDto.projectId,
    );

    return this.create(createRaidItemDto);
  }
}
