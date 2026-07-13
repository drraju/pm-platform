import { Injectable } from '@nestjs/common';
import { AuthorizationActor } from '../../common/authz/authorization-policy.service';
import {
  CreateResourceSkillDto,
  QueryResourceSkillsDto,
  ResourceSkillResponseDto,
  UpdateResourceSkillDto,
} from './dto/resource-skill.dto';
import { ResourceSkillMapper } from './resource-skill.mapper';
import { ResourceSkillService } from './resource-skill.service';

@Injectable()
export class ResourceSkillApiService {
  constructor(
    private readonly resourceSkillService: ResourceSkillService,
  ) {}

  async createResourceSkill(
    input: CreateResourceSkillDto,
    actor: AuthorizationActor,
  ): Promise<ResourceSkillResponseDto> {
    return ResourceSkillMapper.toResponse(
      await this.resourceSkillService.createResourceSkill(
        ResourceSkillMapper.toCreateCommand(input),
        actor,
      ),
    );
  }

  async listResourceSkills(
    query: QueryResourceSkillsDto,
  ): Promise<ResourceSkillResponseDto[]> {
    return ResourceSkillMapper.toResponses(
      await this.resourceSkillService.listResourceSkills(
        ResourceSkillMapper.toListInput(query),
      ),
    );
  }

  async getResourceSkill(
    resourceSkillId: string,
  ): Promise<ResourceSkillResponseDto> {
    return ResourceSkillMapper.toResponse(
      await this.resourceSkillService.getResourceSkillById(resourceSkillId),
    );
  }

  async updateResourceSkill(
    resourceSkillId: string,
    input: UpdateResourceSkillDto,
    actor: AuthorizationActor,
  ): Promise<ResourceSkillResponseDto> {
    return ResourceSkillMapper.toResponse(
      await this.resourceSkillService.updateResourceSkill(
        resourceSkillId,
        ResourceSkillMapper.toUpdateCommand(input),
        actor,
      ),
    );
  }

  async deleteResourceSkill(
    resourceSkillId: string,
    actor: AuthorizationActor,
  ): Promise<void> {
    await this.resourceSkillService.removeResourceSkill(resourceSkillId, actor);
  }

  async listResourceSkillsByResource(
    resourceId: string,
  ): Promise<ResourceSkillResponseDto[]> {
    return ResourceSkillMapper.toResponses(
      await this.resourceSkillService.getResourceSkillsByResource(resourceId),
    );
  }

  async listResourceSkillsBySkill(
    skillId: string,
  ): Promise<ResourceSkillResponseDto[]> {
    return ResourceSkillMapper.toResponses(
      await this.resourceSkillService.getResourceSkillsBySkill(skillId),
    );
  }
}
