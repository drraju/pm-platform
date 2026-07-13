import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthorizationActor } from '../../common/authz/authorization-policy.service';
import { FindOptionsWhere, Not, Repository } from 'typeorm';
import {
  CreateResourceSkillCommand,
  ListResourceSkillsInput,
  UpdateResourceSkillCommand,
} from './resource-skill.commands';
import { ResourceSkill } from './entities/resource-skill.entity';
import { ResourceSkillStatus } from './enums/resource-skill-status.enum';
import { ResourceSkillMapper } from './resource-skill.mapper';
import { ResourceSkillValidationService } from './resource-skill-validation.service';

@Injectable()
export class ResourceSkillService {
  constructor(
    @InjectRepository(ResourceSkill)
    private readonly resourceSkillsRepository: Repository<ResourceSkill>,
    private readonly resourceSkillValidationService: ResourceSkillValidationService,
  ) {}

  async createResourceSkill(
    input: CreateResourceSkillCommand,
    actor?: AuthorizationActor,
  ): Promise<ResourceSkill> {
    return this.resourceSkillsRepository.manager.transaction(async (manager) => {
      await this.resourceSkillValidationService.validateResolvedResourceSkill(
        input,
        manager,
      );
      await this.resourceSkillValidationService.ensureResourceSkillNotDuplicated(
        input,
        undefined,
        manager,
      );

      const resourceSkill = ResourceSkillMapper.fromCreateCommand(input);
      resourceSkill.createdById = actor?.userId;
      resourceSkill.updatedById = actor?.userId;

      return manager.save(ResourceSkill, resourceSkill);
    });
  }

  async updateResourceSkill(
    resourceSkillId: string,
    input: UpdateResourceSkillCommand,
    actor?: AuthorizationActor,
  ): Promise<ResourceSkill> {
    return this.resourceSkillsRepository.manager.transaction(async (manager) => {
      const resourceSkill = await this.findResourceSkillOrThrow(
        resourceSkillId,
        manager,
      );
      const updatedResourceSkill = ResourceSkillMapper.fromUpdateCommand(
        resourceSkill,
        input,
      );

      await this.resourceSkillValidationService.validateResolvedResourceSkill(
        updatedResourceSkill,
        manager,
      );
      await this.resourceSkillValidationService.ensureResourceSkillNotDuplicated(
        updatedResourceSkill,
        resourceSkillId,
        manager,
      );

      updatedResourceSkill.updatedById = actor?.userId;
      return manager.save(ResourceSkill, updatedResourceSkill);
    });
  }

  async removeResourceSkill(
    resourceSkillId: string,
    actor?: AuthorizationActor,
  ): Promise<void> {
    await this.resourceSkillsRepository.manager.transaction(async (manager) => {
      const resourceSkill = await this.findResourceSkillOrThrow(
        resourceSkillId,
        manager,
      );
      resourceSkill.deletedById = actor?.userId;
      resourceSkill.updatedById = actor?.userId;

      await manager.save(ResourceSkill, resourceSkill);
      await manager.softRemove(ResourceSkill, resourceSkill);
    });
  }

  async getResourceSkillById(resourceSkillId: string): Promise<ResourceSkill> {
    return this.findResourceSkillOrThrow(resourceSkillId);
  }

  async getResourceSkillsByResource(
    resourceId: string,
  ): Promise<ResourceSkill[]> {
    await this.resourceSkillValidationService.ensureResourceExists(resourceId);

    return this.resourceSkillsRepository.find({
      order: { createdAt: 'ASC' },
      where: { resourceId },
    });
  }

  async getResourceSkillsBySkill(skillId: string): Promise<ResourceSkill[]> {
    await this.resourceSkillValidationService.ensureSkillExists(skillId);

    return this.resourceSkillsRepository.find({
      order: { createdAt: 'ASC' },
      where: { skillId },
    });
  }

  async listResourceSkills(
    input: ListResourceSkillsInput = {},
  ): Promise<ResourceSkill[]> {
    await this.resourceSkillValidationService.validateResolvedResourceSkill({
      proficiencyLevel: input.proficiencyLevel,
      resourceId: input.resourceId,
      skillId: input.skillId,
      status: input.status,
    });

    const where = this.buildResourceSkillListWhere(input);
    return this.resourceSkillsRepository.find({
      order: { createdAt: 'ASC' },
      where,
    });
  }

  private buildResourceSkillListWhere(
    input: ListResourceSkillsInput,
  ): FindOptionsWhere<ResourceSkill> {
    const where: FindOptionsWhere<ResourceSkill> = {};

    if (!input.includeArchived && !input.status) {
      where.status = Not(ResourceSkillStatus.Archived);
    }

    if (input.status) {
      where.status = input.status;
    }

    if (input.resourceId) {
      where.resourceId = input.resourceId;
    }

    if (input.skillId) {
      where.skillId = input.skillId;
    }

    if (input.proficiencyLevel) {
      where.proficiencyLevel = input.proficiencyLevel;
    }

    return where;
  }

  private async findResourceSkillOrThrow(
    resourceSkillId: string,
    manager?: Repository<ResourceSkill>['manager'],
  ): Promise<ResourceSkill> {
    const resourceSkill =
      (await manager?.findOne(ResourceSkill, {
        where: { id: resourceSkillId },
      })) ??
      (await this.resourceSkillsRepository.findOne({
        where: { id: resourceSkillId },
      }));

    if (!resourceSkill) {
      throw new NotFoundException(
        `Resource skill ${resourceSkillId} not found`,
      );
    }

    return resourceSkill;
  }
}
