import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Not, Repository } from 'typeorm';
import {
  CreateResourceSkillCommand,
  UpdateResourceSkillCommand,
} from './resource-skill.commands';
import { ResourceSkill } from './entities/resource-skill.entity';
import { ResourceSkillStatus } from './enums/resource-skill-status.enum';
import { SkillProficiencyLevel } from './enums/skill-proficiency-level.enum';
import { Resource } from './entities/resource.entity';
import { Skill } from './entities/skill.entity';

export type ResourceSkillValidationInput =
  | CreateResourceSkillCommand
  | UpdateResourceSkillCommand
  | Pick<
      ResourceSkill,
      | 'monthsExperience'
      | 'notes'
      | 'proficiencyLevel'
      | 'resourceId'
      | 'skillId'
      | 'status'
      | 'yearsExperience'
    >;

@Injectable()
export class ResourceSkillValidationService {
  constructor(
    @InjectRepository(ResourceSkill)
    private readonly resourceSkillsRepository: Repository<ResourceSkill>,
    @InjectRepository(Resource)
    private readonly resourcesRepository: Repository<Resource>,
    @InjectRepository(Skill)
    private readonly skillsRepository: Repository<Skill>,
  ) {}

  async validateCreateResourceSkill(input: CreateResourceSkillCommand) {
    await this.validateResourceSkill(input);
  }

  async validateUpdateResourceSkill(input: UpdateResourceSkillCommand) {
    await this.validateResourceSkill(input);
  }

  async validateResolvedResourceSkill(
    input: ResourceSkillValidationInput,
    manager?: EntityManager,
  ) {
    await this.validateResourceSkill(input, manager);
  }

  async ensureResourceSkillNotDuplicated(
    input: Pick<ResourceSkill, 'resourceId' | 'skillId'>,
    resourceSkillId?: string,
    manager?: EntityManager,
  ) {
    const resourceSkillsRepository =
      manager?.getRepository(ResourceSkill) ?? this.resourceSkillsRepository;
    const existing = await resourceSkillsRepository.findOne({
      where: {
        id: resourceSkillId ? Not(resourceSkillId) : undefined,
        resourceId: input.resourceId,
        skillId: input.skillId,
      },
    });

    if (existing) {
      throw new ConflictException('Resource skill already exists');
    }
  }

  private async validateResourceSkill(
    input: ResourceSkillValidationInput,
    manager?: EntityManager,
  ) {
    if (input.resourceId !== undefined) {
      await this.ensureResourceExists(input.resourceId, manager);
    }

    if (input.skillId !== undefined) {
      await this.ensureSkillExists(input.skillId, manager);
    }

    if (
      input.proficiencyLevel !== undefined &&
      input.proficiencyLevel !== null
    ) {
      this.validateAllowedValue(
        input.proficiencyLevel,
        Object.values(SkillProficiencyLevel),
        'proficiency level',
      );
    }

    if (input.status !== undefined && input.status !== null) {
      this.validateAllowedValue(
        input.status,
        Object.values(ResourceSkillStatus),
        'status',
      );
    }

    if (input.yearsExperience !== undefined && input.yearsExperience !== null) {
      this.validateNonNegativeInteger(
        input.yearsExperience,
        'Resource skill years experience',
      );
    }

    if (
      input.monthsExperience !== undefined &&
      input.monthsExperience !== null
    ) {
      this.validateMonthRange(input.monthsExperience);
    }

    if (input.notes !== undefined && input.notes !== null) {
      this.validateText(input.notes, 'Resource skill notes', 2000);
    }
  }

  async ensureResourceExists(resourceId: string, manager?: EntityManager) {
    const resource = await (
      manager?.getRepository(Resource) ?? this.resourcesRepository
    ).findOne({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new NotFoundException(`Resource ${resourceId} not found`);
    }
  }

  async ensureSkillExists(skillId: string, manager?: EntityManager) {
    const skill = await (
      manager?.getRepository(Skill) ?? this.skillsRepository
    ).findOne({
      where: { id: skillId },
    });

    if (!skill) {
      throw new NotFoundException(`Skill ${skillId} not found`);
    }
  }

  private validateAllowedValue(
    value: string,
    allowedValues: string[],
    fieldName: string,
  ) {
    if (!allowedValues.includes(value)) {
      throw new BadRequestException(`Unsupported resource skill ${fieldName}`);
    }
  }

  private validateNonNegativeInteger(value: number, fieldLabel: string) {
    if (!Number.isInteger(value) || value < 0) {
      throw new BadRequestException(
        `${fieldLabel} must be a non-negative integer`,
      );
    }
  }

  private validateMonthRange(value: number) {
    if (!Number.isInteger(value) || value < 0 || value > 11) {
      throw new BadRequestException(
        'Resource skill months experience must be between 0 and 11',
      );
    }
  }

  private validateText(value: string, fieldLabel: string, maxLength: number) {
    const trimmedValue = value.trim();
    if (trimmedValue.length > maxLength) {
      throw new BadRequestException(
        `${fieldLabel} must be at most ${maxLength} characters`,
      );
    }
  }
}
