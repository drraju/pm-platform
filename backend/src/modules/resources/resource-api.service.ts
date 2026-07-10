import { Injectable } from '@nestjs/common';
import { AuthorizationActor } from '../../common/authz/authorization-policy.service';
import { ResourceMapper } from './resource.mapper';
import { ResourceService } from './resource.service';
import {
  CreateResourceDto,
  QueryResourcesDto,
  ResourceResponseDto,
  UpdateResourceDto,
} from './dto/resource.dto';

@Injectable()
export class ResourceApiService {
  constructor(private readonly resourceService: ResourceService) {}

  async createResource(
    input: CreateResourceDto,
    actor: AuthorizationActor,
  ): Promise<ResourceResponseDto> {
    return ResourceMapper.toResponse(
      await this.resourceService.createResource(input, actor),
    );
  }

  async listResources(
    query: QueryResourcesDto,
  ): Promise<ResourceResponseDto[]> {
    return ResourceMapper.toResponses(
      await this.resourceService.listResources(query),
    );
  }

  async getResource(resourceId: string): Promise<ResourceResponseDto> {
    return ResourceMapper.toResponse(
      await this.resourceService.findResource(resourceId),
    );
  }

  async updateResource(
    resourceId: string,
    input: UpdateResourceDto,
    actor: AuthorizationActor,
  ): Promise<ResourceResponseDto> {
    return ResourceMapper.toResponse(
      await this.resourceService.updateResource(resourceId, input, actor),
    );
  }

  async deleteResource(
    resourceId: string,
    actor: AuthorizationActor,
  ): Promise<void> {
    await this.resourceService.archiveResource(resourceId, actor);
  }
}
