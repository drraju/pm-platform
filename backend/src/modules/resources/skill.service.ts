import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Not, Repository } from 'typeorm';
import { AuthorizationActor } from '../../common/authz/authorization-policy.service';
import { Skill } from './entities/skill.entity';
import { SkillStatus } from './enums/skill-status.enum';
import {
  ListSkillsInput,
  CreateSkillCommand,
  UpdateSkillCommand,
} from './skill.commands';
import { SkillMapper } from './skill.mapper';
import { SkillValidationService } from './skill-validation.service';

@Injectable()
export class SkillService {
  constructor(
    @InjectRepository(Skill)
    private readonly skillsRepository: Repository<Skill>,
    private readonly skillValidationService: SkillValidationService,
  ) {}

  async createSkill(
    input: CreateSkillCommand,
    actor?: AuthorizationActor,
  ): Promise<Skill> {
    this.skillValidationService.validateCreateSkill(input);
    await this.skillValidationService.ensureSkillNameIsUnique(input.name);

    const skill = SkillMapper.fromCreateCommand(input);
    skill.createdById = actor?.userId;
    skill.updatedById = actor?.userId;

    return this.skillsRepository.save(skill);
  }

  async updateSkill(
    skillId: string,
    input: UpdateSkillCommand,
    actor?: AuthorizationActor,
  ): Promise<Skill> {
    this.skillValidationService.validateUpdateSkill(input);

    if (input.name !== undefined) {
      await this.skillValidationService.ensureSkillNameIsUnique(
        input.name,
        skillId,
      );
    }

    const skill = await this.findSkill(skillId);
    const updatedSkill = SkillMapper.fromUpdateCommand(skill, input);
    updatedSkill.updatedById = actor?.userId;

    return this.skillsRepository.save(updatedSkill);
  }

  async archiveSkill(
    skillId: string,
    actor?: AuthorizationActor,
  ): Promise<Skill> {
    const skill = await this.findSkill(skillId);
    skill.status = SkillStatus.Archived;
    skill.updatedById = actor?.userId;
    return this.skillsRepository.save(skill);
  }

  async listSkills(input: ListSkillsInput = {}): Promise<Skill[]> {
    if (input.status) {
      this.skillValidationService.validateResolvedSkill({
        status: input.status,
      });
    }

    const where = this.buildSkillListWhere(input);
    return this.skillsRepository.find({
      order: { createdAt: 'ASC', name: 'ASC' },
      where,
    });
  }

  async findSkill(skillId: string): Promise<Skill> {
    const skill = await this.skillsRepository.findOne({
      where: { id: skillId },
    });

    if (!skill) {
      throw new NotFoundException(`Skill ${skillId} not found`);
    }

    return skill;
  }

  private buildSkillListWhere(
    input: ListSkillsInput,
  ): FindOptionsWhere<Skill>[] | FindOptionsWhere<Skill> {
    const baseWhere: FindOptionsWhere<Skill> = {};

    if (!input.includeArchived && !input.status) {
      baseWhere.status = Not(SkillStatus.Archived);
    }

    if (input.status) {
      baseWhere.status = input.status;
    }

    if (input.category) {
      baseWhere.category = input.category.trim();
    }

    const search = input.search?.trim();
    if (!search) {
      return baseWhere;
    }

    return [
      { ...baseWhere, name: ILike(`%${search}%`) },
      { ...baseWhere, category: ILike(`%${search}%`) },
    ];
  }
}
