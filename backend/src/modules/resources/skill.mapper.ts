import {
  CreateSkillDto,
  QuerySkillsDto,
  SkillResponseDto,
  UpdateSkillDto,
} from './dto/skill.dto';
import { Skill } from './entities/skill.entity';
import { SkillStatus } from './enums/skill-status.enum';
import {
  CreateSkillCommand,
  ListSkillsInput,
  UpdateSkillCommand,
} from './skill.commands';

export class SkillMapper {
  static toCreateCommand(input: CreateSkillDto): CreateSkillCommand {
    return {
      category: input.category ?? null,
      description: input.description ?? null,
      name: input.name,
      status: input.status,
    };
  }

  static toUpdateCommand(input: UpdateSkillDto): UpdateSkillCommand {
    return {
      category:
        input.category !== undefined ? (input.category ?? null) : undefined,
      description:
        input.description !== undefined ? (input.description ?? null) : undefined,
      name: input.name,
      status: input.status,
    };
  }

  static toListInput(input: QuerySkillsDto): ListSkillsInput {
    return {
      category: input.category,
      includeArchived: input.includeArchived,
      search: input.search,
      status: input.status,
    };
  }

  static toResponse(skill: Skill): SkillResponseDto {
    return {
      category: skill.category ?? null,
      createdAt: skill.createdAt,
      description: skill.description ?? null,
      id: skill.id,
      name: skill.name,
      status: skill.status,
      updatedAt: skill.updatedAt,
    };
  }

  static toResponses(skills: Skill[]): SkillResponseDto[] {
    return skills.map((skill) => this.toResponse(skill));
  }

  static fromCreateCommand(input: CreateSkillCommand): Skill {
    return Object.assign(new Skill(), {
      category: input.category ?? null,
      description: input.description ?? null,
      name: input.name,
      status: input.status ?? SkillStatus.Proposed,
    });
  }

  static fromUpdateCommand(skill: Skill, input: UpdateSkillCommand): Skill {
    return Object.assign(new Skill(), skill, {
      category:
        input.category !== undefined ? (input.category ?? null) : skill.category,
      description:
        input.description !== undefined
          ? (input.description ?? null)
          : skill.description,
      name: input.name ?? skill.name,
      status: input.status ?? skill.status,
    });
  }
}
