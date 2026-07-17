import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Skill } from './entities/skill.entity';
import { SkillStatus } from './enums/skill-status.enum';
import { CreateSkillCommand, UpdateSkillCommand } from './skill.commands';

export type SkillValidationInput =
  | CreateSkillCommand
  | UpdateSkillCommand
  | Pick<Skill, 'category' | 'description' | 'name' | 'status'>;

@Injectable()
export class SkillValidationService {
  constructor(
    @InjectRepository(Skill)
    private readonly skillsRepository: Repository<Skill>,
  ) {}

  validateCreateSkill(input: CreateSkillCommand) {
    this.validateSkill(input);
  }

  validateUpdateSkill(input: UpdateSkillCommand) {
    this.validateSkill(input);
  }

  validateResolvedSkill(input: SkillValidationInput) {
    this.validateSkill(input);
  }

  async ensureSkillNameIsUnique(
    name: string,
    skillId?: string,
    manager?: EntityManager,
  ) {
    const skillsRepository =
      manager?.getRepository(Skill) ?? this.skillsRepository;
    const existing = await skillsRepository
      .createQueryBuilder('skill')
      .where('LOWER(skill.name) = LOWER(:name)', { name: name.trim() })
      .andWhere(skillId ? 'skill.id <> :skillId' : '1=1', { skillId })
      .getOne();

    if (existing) {
      throw new ConflictException('Skill name already exists');
    }
  }

  private validateSkill(input: SkillValidationInput) {
    if (input.name !== undefined) {
      this.validateText(input.name, 'Skill name', true, 255);
    }

    if (input.category !== undefined && input.category !== null) {
      this.validateText(input.category, 'Skill category', false, 255);
    }

    if (input.description !== undefined && input.description !== null) {
      this.validateText(input.description, 'Skill description', false, 2000);
    }

    if (input.status !== undefined && input.status !== null) {
      this.validateAllowedValue(
        input.status,
        Object.values(SkillStatus),
        'status',
      );
    }
  }

  private validateAllowedValue(
    value: string,
    allowedValues: string[],
    fieldName: string,
  ) {
    if (!allowedValues.includes(value)) {
      throw new BadRequestException(`Unsupported skill ${fieldName}`);
    }
  }

  private validateText(
    value: string | null | undefined,
    fieldLabel: string,
    required: boolean,
    maxLength: number,
  ) {
    const trimmedValue = value?.trim();
    if (required && !trimmedValue) {
      throw new BadRequestException(`${fieldLabel} is required`);
    }

    if (trimmedValue && trimmedValue.length > maxLength) {
      throw new BadRequestException(
        `${fieldLabel} must be at most ${maxLength} characters`,
      );
    }
  }
}
