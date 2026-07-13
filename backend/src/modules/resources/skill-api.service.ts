import { Injectable } from '@nestjs/common';
import { AuthorizationActor } from '../../common/authz/authorization-policy.service';
import {
  CreateSkillDto,
  QuerySkillsDto,
  SkillResponseDto,
  UpdateSkillDto,
} from './dto/skill.dto';
import { SkillMapper } from './skill.mapper';
import { SkillService } from './skill.service';

@Injectable()
export class SkillApiService {
  constructor(private readonly skillService: SkillService) {}

  async createSkill(
    input: CreateSkillDto,
    actor: AuthorizationActor,
  ): Promise<SkillResponseDto> {
    return SkillMapper.toResponse(
      await this.skillService.createSkill(
        SkillMapper.toCreateCommand(input),
        actor,
      ),
    );
  }

  async listSkills(query: QuerySkillsDto): Promise<SkillResponseDto[]> {
    return SkillMapper.toResponses(
      await this.skillService.listSkills(SkillMapper.toListInput(query)),
    );
  }

  async getSkill(skillId: string): Promise<SkillResponseDto> {
    return SkillMapper.toResponse(await this.skillService.findSkill(skillId));
  }

  async updateSkill(
    skillId: string,
    input: UpdateSkillDto,
    actor: AuthorizationActor,
  ): Promise<SkillResponseDto> {
    return SkillMapper.toResponse(
      await this.skillService.updateSkill(
        skillId,
        SkillMapper.toUpdateCommand(input),
        actor,
      ),
    );
  }

  async deleteSkill(skillId: string, actor: AuthorizationActor): Promise<void> {
    await this.skillService.archiveSkill(skillId, actor);
  }
}
