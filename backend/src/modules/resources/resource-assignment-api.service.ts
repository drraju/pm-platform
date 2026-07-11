import { Injectable } from '@nestjs/common';
import { AuthorizationActor } from '../../common/authz/authorization-policy.service';
import {
  CreateResourceAssignmentDto,
  ResourceAssignmentResponseDto,
  UpdateResourceAssignmentDto,
} from './dto/resource-assignment.dto';
import { ResourceAssignmentMapper } from './resource-assignment.mapper';
import { ResourceAssignmentService } from './resource-assignment.service';

@Injectable()
export class ResourceAssignmentApiService {
  constructor(
    private readonly resourceAssignmentService: ResourceAssignmentService,
  ) {}

  async createAssignment(
    input: CreateResourceAssignmentDto,
    actor: AuthorizationActor,
  ): Promise<ResourceAssignmentResponseDto> {
    return ResourceAssignmentMapper.toResponse(
      await this.resourceAssignmentService.createAssignment(
        ResourceAssignmentMapper.toCreateCommand(input),
        actor,
      ),
    );
  }

  async updateAssignment(
    assignmentId: string,
    input: UpdateResourceAssignmentDto,
    actor: AuthorizationActor,
  ): Promise<ResourceAssignmentResponseDto> {
    return ResourceAssignmentMapper.toResponse(
      await this.resourceAssignmentService.updateAssignment(
        assignmentId,
        ResourceAssignmentMapper.toUpdateCommand(input),
        actor,
      ),
    );
  }

  async deleteAssignment(
    assignmentId: string,
    actor: AuthorizationActor,
  ): Promise<void> {
    await this.resourceAssignmentService.removeAssignment(assignmentId, actor);
  }

  async getAssignmentById(
    assignmentId: string,
  ): Promise<ResourceAssignmentResponseDto> {
    return ResourceAssignmentMapper.toResponse(
      await this.resourceAssignmentService.getAssignmentById(assignmentId),
    );
  }

  async listAssignmentsByProject(
    projectId: string,
  ): Promise<ResourceAssignmentResponseDto[]> {
    return ResourceAssignmentMapper.toResponses(
      await this.resourceAssignmentService.getAssignmentsByProject(projectId),
    );
  }

  async listAssignmentsByResource(
    resourceId: string,
  ): Promise<ResourceAssignmentResponseDto[]> {
    return ResourceAssignmentMapper.toResponses(
      await this.resourceAssignmentService.getAssignmentsByResource(resourceId),
    );
  }
}
