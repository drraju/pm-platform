import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, In, Repository } from 'typeorm';
import { RaidType } from '../../common/enums/raid-type.enum';
import {
  ProjectVisibilityActor,
  ProjectVisibilityService,
} from '../projects/project-visibility.service';
import { Role } from '../users/entities/role.entity';
import { CreateRaidItemDto } from './dto/create-raid-item.dto';
import { UpdateRaidItemDto } from './dto/update-raid-item.dto';
import { Assumption } from './entities/assumption.entity';
import { Dependency } from './entities/dependency.entity';
import { Issue } from './entities/issue.entity';
import { RaidItem } from './entities/raid-item.entity';
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
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    private readonly projectVisibilityService: ProjectVisibilityService,
  ) {}

  async findAll(actor?: ProjectVisibilityActor) {
    const relations = { project: true, owner: true };
    const visibleProjectIds =
      await this.projectVisibilityService.getVisibleProjectIds(actor);
    const visibilityFilter =
      visibleProjectIds === 'all'
        ? {}
        : { where: { projectId: In(visibleProjectIds) } };

    if (visibleProjectIds !== 'all' && visibleProjectIds.length === 0) {
      return [];
    }

    const findOptions: FindManyOptions<Risk> = {
      relations,
      ...visibilityFilter,
    };
    const [risks, issues, assumptions, dependencies] = await Promise.all([
      this.risksRepository.find(findOptions),
      this.issuesRepository.find({ relations, ...visibilityFilter }),
      this.assumptionsRepository.find({ relations, ...visibilityFilter }),
      this.dependenciesRepository.find({ relations, ...visibilityFilter }),
    ]);

    return [...risks, ...issues, ...assumptions, ...dependencies].sort(
      (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
    );
  }

  async create(
    createRaidItemDto: CreateRaidItemDto,
    actor?: ProjectVisibilityActor,
  ) {
    await this.ensureProjectVisible(createRaidItemDto.projectId, actor);

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

  async update(
    id: string,
    updateRaidItemDto: UpdateRaidItemDto,
    actor?: ProjectVisibilityActor,
  ) {
    const item = await this.findOneAcrossRegisters(id, actor);
    await this.ensureCanUpdateItem(item, actor);
    Object.assign(item, this.withoutImmutableFields(updateRaidItemDto));
    return this.saveItem(item);
  }

  async remove(id: string, actor?: ProjectVisibilityActor): Promise<void> {
    const item = await this.findOneAcrossRegisters(id, actor);
    await this.ensureCanDeleteItem(item, actor);
    await this.removeItem(item);
  }

  private async findOneAcrossRegisters(
    id: string,
    actor?: ProjectVisibilityActor,
  ): Promise<Risk | Issue | Assumption | Dependency> {
    const relations = { project: true, owner: true };
    const lookups = await Promise.all([
      this.risksRepository.findOne({ relations, where: { id } }),
      this.issuesRepository.findOne({ relations, where: { id } }),
      this.assumptionsRepository.findOne({ relations, where: { id } }),
      this.dependenciesRepository.findOne({ relations, where: { id } }),
    ]);
    const itemIndex = lookups.findIndex(Boolean);
    const item = lookups[itemIndex];

    if (
      !item ||
      !(await this.projectVisibilityService.canViewProject(item.projectId, actor))
    ) {
      throw new NotFoundException(`RAID item ${id} not found`);
    }

    return item;
  }

  private saveItem(item: Risk | Issue | Assumption | Dependency) {
    switch (item.type) {
      case RaidType.Risk:
        return this.risksRepository.save(item as Risk);
      case RaidType.Issue:
        return this.issuesRepository.save(item as Issue);
      case RaidType.Assumption:
        return this.assumptionsRepository.save(item as Assumption);
      case RaidType.Dependency:
        return this.dependenciesRepository.save(item as Dependency);
    }
  }

  private async removeItem(item: Risk | Issue | Assumption | Dependency) {
    switch (item.type) {
      case RaidType.Risk:
        await this.risksRepository.remove(item as Risk);
        return;
      case RaidType.Issue:
        await this.issuesRepository.remove(item as Issue);
        return;
      case RaidType.Assumption:
        await this.assumptionsRepository.remove(item as Assumption);
        return;
      case RaidType.Dependency:
        await this.dependenciesRepository.remove(item as Dependency);
        return;
    }
  }

  private async ensureProjectVisible(
    projectId: string,
    actor?: ProjectVisibilityActor,
  ) {
    if (await this.projectVisibilityService.canViewProject(projectId, actor)) {
      return;
    }

    throw new NotFoundException(`Project ${projectId} not found`);
  }

  private async ensureCanUpdateItem(
    item: RaidItem,
    actor?: ProjectVisibilityActor,
  ) {
    const permissions = await this.getActorPermissionKeys(actor);
    if (permissions.has('raid:update:any') || permissions.has('raid.delete')) {
      return;
    }
    if (permissions.has('raid:update:own') && item.ownerId === actor?.userId) {
      return;
    }
    if (permissions.has('raid.update') && item.ownerId === actor?.userId) {
      return;
    }

    throw new ForbiddenException('Insufficient RAID update permissions');
  }

  private async ensureCanDeleteItem(
    item: RaidItem,
    actor?: ProjectVisibilityActor,
  ) {
    const permissions = await this.getActorPermissionKeys(actor);
    if (permissions.has('raid:delete') || permissions.has('raid.delete')) {
      return;
    }

    throw new ForbiddenException('Insufficient RAID delete permissions');
  }

  private async getActorPermissionKeys(actor?: ProjectVisibilityActor) {
    if (!actor?.roleId) {
      return new Set<string>();
    }

    const role = await this.rolesRepository.findOne({
      relations: { permissions: true },
      where: { id: actor.roleId },
    });
    if (role?.name === 'SUPER_ADMIN') {
      return new Set(['raid:update:any', 'raid:delete', 'raid.delete']);
    }

    return new Set(role?.permissions?.map((permission) => permission.key) ?? []);
  }

  private withoutImmutableFields(updateRaidItemDto: UpdateRaidItemDto) {
    const { projectId, type, ...mutableFields } = updateRaidItemDto;
    return mutableFields;
  }
}
