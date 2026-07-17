import {
  CreateResourceSkillDto,
  QueryResourceSkillsDto,
  ResourceSkillResponseDto,
  UpdateResourceSkillDto,
} from './dto/resource-skill.dto';
import { ResourceSkill } from './entities/resource-skill.entity';
import { ResourceSkillStatus } from './enums/resource-skill-status.enum';
import {
  CreateResourceSkillCommand,
  ListResourceSkillsInput,
  UpdateResourceSkillCommand,
} from './resource-skill.commands';

export class ResourceSkillMapper {
  static toCreateCommand(
    input: CreateResourceSkillDto,
  ): CreateResourceSkillCommand {
    return {
      monthsExperience: input.monthsExperience ?? null,
      notes: input.notes ?? null,
      proficiencyLevel: input.proficiencyLevel,
      resourceId: input.resourceId,
      skillId: input.skillId,
      status: input.status,
      yearsExperience: input.yearsExperience ?? null,
    };
  }

  static toUpdateCommand(
    input: UpdateResourceSkillDto,
  ): UpdateResourceSkillCommand {
    return {
      monthsExperience:
        input.monthsExperience !== undefined
          ? (input.monthsExperience ?? null)
          : undefined,
      notes: input.notes !== undefined ? (input.notes ?? null) : undefined,
      proficiencyLevel: input.proficiencyLevel,
      resourceId: input.resourceId,
      skillId: input.skillId,
      status: input.status,
      yearsExperience:
        input.yearsExperience !== undefined
          ? (input.yearsExperience ?? null)
          : undefined,
    };
  }

  static toListInput(input: QueryResourceSkillsDto): ListResourceSkillsInput {
    return {
      includeArchived: input.includeArchived,
      proficiencyLevel: input.proficiencyLevel,
      resourceId: input.resourceId,
      skillId: input.skillId,
      status: input.status,
    };
  }

  static toResponse(resourceSkill: ResourceSkill): ResourceSkillResponseDto {
    return {
      createdAt: resourceSkill.createdAt,
      id: resourceSkill.id,
      monthsExperience: resourceSkill.monthsExperience ?? null,
      notes: resourceSkill.notes ?? null,
      proficiencyLevel: resourceSkill.proficiencyLevel,
      resourceId: resourceSkill.resourceId,
      skillId: resourceSkill.skillId,
      status: resourceSkill.status,
      updatedAt: resourceSkill.updatedAt,
      yearsExperience: resourceSkill.yearsExperience ?? null,
    };
  }

  static toResponses(
    resourceSkills: ResourceSkill[],
  ): ResourceSkillResponseDto[] {
    return resourceSkills.map((resourceSkill) =>
      this.toResponse(resourceSkill),
    );
  }

  static fromCreateCommand(input: CreateResourceSkillCommand): ResourceSkill {
    return Object.assign(new ResourceSkill(), {
      monthsExperience: input.monthsExperience ?? null,
      notes: input.notes ?? null,
      proficiencyLevel: input.proficiencyLevel,
      resourceId: input.resourceId,
      skillId: input.skillId,
      status: input.status ?? ResourceSkillStatus.Draft,
      yearsExperience: input.yearsExperience ?? null,
    });
  }

  static fromUpdateCommand(
    resourceSkill: ResourceSkill,
    input: UpdateResourceSkillCommand,
  ): ResourceSkill {
    return Object.assign(new ResourceSkill(), resourceSkill, {
      monthsExperience:
        input.monthsExperience !== undefined
          ? (input.monthsExperience ?? null)
          : resourceSkill.monthsExperience,
      notes:
        input.notes !== undefined ? (input.notes ?? null) : resourceSkill.notes,
      proficiencyLevel:
        input.proficiencyLevel ?? resourceSkill.proficiencyLevel,
      resourceId: input.resourceId ?? resourceSkill.resourceId,
      skillId: input.skillId ?? resourceSkill.skillId,
      status: input.status ?? resourceSkill.status,
      yearsExperience:
        input.yearsExperience !== undefined
          ? (input.yearsExperience ?? null)
          : resourceSkill.yearsExperience,
    });
  }
}
