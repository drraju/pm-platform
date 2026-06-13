import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, In, Repository } from 'typeorm';
import { AuthorizationPolicyService } from '../../common/authz/authorization-policy.service';
import { PermissionKey } from '../../common/authz/permissions';
import { RaidType } from '../../common/enums/raid-type.enum';
import {
  ProjectVisibilityActor,
  ProjectVisibilityService,
} from '../projects/project-visibility.service';
import { CreateRaidItemDto } from './dto/create-raid-item.dto';
import { CreateRaidCommentDto } from './dto/create-raid-comment.dto';
import { UpdateRaidItemDto } from './dto/update-raid-item.dto';
import { Assumption } from './entities/assumption.entity';
import { Dependency } from './entities/dependency.entity';
import { Issue } from './entities/issue.entity';
import { RaidComment } from './entities/raid-comment.entity';
import { RaidHistoryEntry } from './entities/raid-history-entry.entity';
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
    @InjectRepository(RaidComment)
    private readonly raidCommentsRepository: Repository<RaidComment>,
    @InjectRepository(RaidHistoryEntry)
    private readonly raidHistoryRepository: Repository<RaidHistoryEntry>,
    private readonly authorizationPolicyService: AuthorizationPolicyService,
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

    return this.attachAuditData(
      [...risks, ...issues, ...assumptions, ...dependencies].sort(
        (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
      ),
    );
  }

  async create(
    createRaidItemDto: CreateRaidItemDto,
    actor?: ProjectVisibilityActor,
  ) {
    await this.ensureProjectVisible(createRaidItemDto.projectId, actor);

    switch (createRaidItemDto.type) {
      case RaidType.Risk:
        return this.createItem(this.risksRepository, createRaidItemDto, actor);
      case RaidType.Issue:
        return this.createItem(this.issuesRepository, createRaidItemDto, actor);
      case RaidType.Assumption:
        return this.createItem(
          this.assumptionsRepository,
          createRaidItemDto,
          actor,
        );
      case RaidType.Dependency:
        return this.createItem(
          this.dependenciesRepository,
          createRaidItemDto,
          actor,
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
    const changes = this.buildChangeSet(item, updateRaidItemDto);

    Object.assign(item, this.withoutImmutableFields(updateRaidItemDto), {
      updatedById: actor?.userId,
    });

    await this.saveItem(item);
    await this.recordUpdateHistory(item, changes, actor);

    return this.loadDetailedItem(item.id, actor);
  }

  async remove(id: string, actor?: ProjectVisibilityActor): Promise<void> {
    const item = await this.findOneAcrossRegisters(id, actor);
    await this.ensureCanDeleteItem(item, actor);
    item.deletedById = actor?.userId;
    await this.recordHistoryEntry(item, {
      action: 'deleted',
      nextValue: actor?.userId ?? null,
    });
    await this.removeItem(item);
  }

  async addComment(
    id: string,
    createRaidCommentDto: CreateRaidCommentDto,
    actor?: ProjectVisibilityActor,
  ) {
    const item = await this.findOneAcrossRegisters(id, actor);
    await this.ensureCanUpdateItem(item, actor);

    await this.raidCommentsRepository.save(
      this.raidCommentsRepository.create({
        authorId: actor?.userId,
        body: createRaidCommentDto.body.trim(),
        createdById: actor?.userId,
        projectId: item.projectId,
        raidItemId: item.id,
        raidType: item.type,
        updatedById: actor?.userId,
      }),
    );

    await this.recordHistoryEntry(item, {
      action: 'commented',
      nextValue: createRaidCommentDto.body.trim(),
    });

    return this.loadDetailedItem(item.id, actor);
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
        await this.risksRepository.softRemove(item as Risk);
        return;
      case RaidType.Issue:
        await this.issuesRepository.softRemove(item as Issue);
        return;
      case RaidType.Assumption:
        await this.assumptionsRepository.softRemove(item as Assumption);
        return;
      case RaidType.Dependency:
        await this.dependenciesRepository.softRemove(item as Dependency);
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
    if (await this.authorizationPolicyService.canManageRaid(item.projectId, actor)) {
      return;
    }

    if (
      item.ownerId === actor?.userId &&
      (await this.authorizationPolicyService.hasPermission(
        actor,
        PermissionKey.RaidUpdate,
      ))
    ) {
      return;
    }

    throw new ForbiddenException('Insufficient RAID update permissions');
  }

  private async ensureCanDeleteItem(
    item: RaidItem,
    actor?: ProjectVisibilityActor,
  ) {
    if (
      (await this.authorizationPolicyService.canManageRaid(item.projectId, actor)) &&
      (await this.authorizationPolicyService.hasPermission(
        actor,
        PermissionKey.RaidDelete,
      ))
    ) {
      return;
    }

    throw new ForbiddenException('Insufficient RAID delete permissions');
  }

  private withoutImmutableFields(updateRaidItemDto: UpdateRaidItemDto) {
    const { projectId, type, ...mutableFields } = updateRaidItemDto;
    return mutableFields;
  }

  private async createItem<T extends Risk | Issue | Assumption | Dependency>(
    repository: Repository<T>,
    createRaidItemDto: CreateRaidItemDto,
    actor?: ProjectVisibilityActor,
  ) {
    const entity = repository.create({
        ...createRaidItemDto,
        createdById: actor?.userId,
        updatedById: actor?.userId,
      } as unknown as T);
    const createdItem = (await repository.save(entity)) as T;

    await this.recordHistoryEntry(createdItem, {
      action: 'created',
      changes: this.toHistoryChanges(
        this.buildChangeSet({} as RaidItem, createRaidItemDto),
      ),
    });

    return this.loadDetailedItem(createdItem.id, actor);
  }

  private async loadDetailedItem(id: string, actor?: ProjectVisibilityActor) {
    const item = await this.findOneAcrossRegisters(id, actor);
    const [detailedItem] = await this.attachAuditData([item]);
    return detailedItem;
  }

  private async attachAuditData<T extends RaidItem>(items: T[]) {
    if (items.length === 0) {
      return items;
    }

    const itemIds = items.map((item) => item.id);
    const comments = await this.raidCommentsRepository.find({
      relations: { author: true },
      order: { createdAt: 'ASC' },
      where: { raidItemId: In(itemIds) },
    });
    const historyEntries = await this.raidHistoryRepository.find({
      relations: { actor: true },
      order: { createdAt: 'DESC' },
      where: { raidItemId: In(itemIds) },
    });

    const commentsByKey = new Map<string, RaidComment[]>();
    const historyByKey = new Map<string, RaidHistoryEntry[]>();

    for (const comment of comments) {
      const key = this.auditKey(comment.raidType, comment.raidItemId);
      commentsByKey.set(key, [...(commentsByKey.get(key) ?? []), comment]);
    }

    for (const entry of historyEntries) {
      const key = this.auditKey(entry.raidType, entry.raidItemId);
      historyByKey.set(key, [...(historyByKey.get(key) ?? []), entry]);
    }

    return items.map((item) =>
      Object.assign(item, {
        comments: commentsByKey.get(this.auditKey(item.type, item.id)) ?? [],
        history: historyByKey.get(this.auditKey(item.type, item.id)) ?? [],
      }),
    );
  }

  private auditKey(type: RaidType, id: string) {
    return `${type}:${id}`;
  }

  private buildChangeSet(
    currentItem: Partial<RaidItem>,
    nextValues: Partial<UpdateRaidItemDto | CreateRaidItemDto>,
  ) {
    const fieldsToTrack = [
      'title',
      'description',
      'ownerId',
      'status',
      'severity',
      'probability',
      'impact',
      'mitigationPlan',
      'resolutionPlan',
      'validationStatus',
      'validationNotes',
      'dependsOn',
      'dueDate',
    ] as const;

    return fieldsToTrack.flatMap((fieldName) => {
      const nextValue = nextValues[fieldName];

      if (typeof nextValue === 'undefined') {
        return [];
      }

      const previousValue = currentItem[fieldName as keyof typeof currentItem];

      if (this.normalizeHistoryValue(previousValue) === this.normalizeHistoryValue(nextValue)) {
        return [];
      }

      return [
        {
          fieldName,
          nextValue: this.normalizeHistoryValue(nextValue),
          previousValue: this.normalizeHistoryValue(previousValue),
        },
      ];
    });
  }

  private async recordUpdateHistory(
    item: Risk | Issue | Assumption | Dependency,
    changes: Array<{ fieldName: string; nextValue: string | null; previousValue: string | null }>,
    actor?: ProjectVisibilityActor,
  ) {
    for (const change of changes) {
      await this.recordHistoryEntry(item, {
        action:
          change.fieldName === 'status'
            ? 'status_changed'
            : change.fieldName === 'ownerId'
              ? 'owner_changed'
              : 'updated',
        actorId: actor?.userId,
        fieldName: change.fieldName,
        nextValue: change.nextValue,
        previousValue: change.previousValue,
      });
    }
  }

  private async recordHistoryEntry(
    item: Risk | Issue | Assumption | Dependency | RaidItem,
    input: {
      action: string;
      actorId?: string | null;
      changes?: Record<string, { previousValue: string | null; nextValue: string | null }> | null;
      fieldName?: string | null;
      nextValue?: string | null;
      previousValue?: string | null;
    },
  ) {
    await this.raidHistoryRepository.save(
      this.raidHistoryRepository.create({
        action: input.action,
        actorId: input.actorId,
        changes: input.changes ?? null,
        createdById: input.actorId,
        fieldName: input.fieldName ?? null,
        nextValue: input.nextValue ?? null,
        previousValue: input.previousValue ?? null,
        projectId: item.projectId,
        raidItemId: item.id,
        raidType: item.type,
        updatedById: input.actorId,
      }),
    );
  }

  private toHistoryChanges(
    changes: Array<{ fieldName: string; nextValue: string | null; previousValue: string | null }>,
  ) {
    if (changes.length === 0) {
      return null;
    }

    return Object.fromEntries(
      changes.map((change) => [
        change.fieldName,
        {
          previousValue: change.previousValue,
          nextValue: change.nextValue,
        },
      ]),
    );
  }

  private normalizeHistoryValue(value: unknown) {
    if (value === null || typeof value === 'undefined') {
      return null;
    }

    return String(value);
  }
}
