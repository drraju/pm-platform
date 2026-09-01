import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AuthorizationActor,
  AuthorizationPolicyService,
} from '../../common/authz/authorization-policy.service';
import { Repository } from 'typeorm';
import {
  CreateResourceAssignmentCommand,
  UpdateResourceAssignmentCommand,
} from './resource-assignment.commands';
import { ResourceAssignmentMapper } from './resource-assignment.mapper';
import { ResourceAssignment } from './entities/resource-assignment.entity';
import { ResourceAssignmentValidationService } from './resource-assignment-validation.service';

@Injectable()
export class ResourceAssignmentService {
  constructor(
    @InjectRepository(ResourceAssignment)
    private readonly assignmentsRepository: Repository<ResourceAssignment>,
    private readonly assignmentValidationService: ResourceAssignmentValidationService,
    private readonly authorizationPolicyService: AuthorizationPolicyService,
  ) {}

  async createAssignment(
    input: CreateResourceAssignmentCommand,
    actor?: AuthorizationActor,
  ): Promise<ResourceAssignment> {
    await this.ensureProjectMutationAllowed(actor);
    return this.assignmentsRepository.manager.transaction(async (manager) => {
      await this.assignmentValidationService.validateResolvedAssignment(
        input,
        manager,
      );
      await this.assignmentValidationService.ensureAssignmentNotDuplicated(
        input,
        undefined,
        manager,
      );

      const assignment = ResourceAssignmentMapper.fromCreateCommand(input);
      assignment.createdById = actor?.userId;
      assignment.updatedById = actor?.userId;

      return manager.save(ResourceAssignment, assignment);
    });
  }

  async updateAssignment(
    assignmentId: string,
    input: UpdateResourceAssignmentCommand,
    actor?: AuthorizationActor,
  ): Promise<ResourceAssignment> {
    await this.ensureProjectMutationAllowed(actor);
    return this.assignmentsRepository.manager.transaction(async (manager) => {
      const assignment = await this.findAssignmentOrThrow(
        assignmentId,
        manager,
      );
      const updatedAssignment = ResourceAssignmentMapper.fromUpdateCommand(
        assignment,
        input,
      );

      await this.assignmentValidationService.validateResolvedAssignment(
        updatedAssignment,
        manager,
      );
      await this.assignmentValidationService.ensureAssignmentNotDuplicated(
        updatedAssignment,
        assignmentId,
        manager,
      );

      updatedAssignment.updatedById = actor?.userId;
      return manager.save(ResourceAssignment, updatedAssignment);
    });
  }

  async removeAssignment(
    assignmentId: string,
    actor?: AuthorizationActor,
  ): Promise<void> {
    await this.ensureProjectMutationAllowed(actor);
    await this.assignmentsRepository.manager.transaction(async (manager) => {
      const assignment = await this.findAssignmentOrThrow(
        assignmentId,
        manager,
      );
      assignment.deletedById = actor?.userId;
      assignment.updatedById = actor?.userId;

      await manager.save(ResourceAssignment, assignment);
      await manager.softRemove(ResourceAssignment, assignment);
    });
  }

  async getAssignmentById(assignmentId: string): Promise<ResourceAssignment> {
    return this.findAssignmentOrThrow(assignmentId);
  }

  async getAssignmentsByProject(
    projectId: string,
  ): Promise<ResourceAssignment[]> {
    await this.assignmentValidationService.ensureProjectExists(projectId);

    return this.assignmentsRepository.find({
      order: { createdAt: 'ASC', startDate: 'ASC' },
      where: { projectId },
    });
  }

  async getAssignmentsByResource(
    resourceId: string,
  ): Promise<ResourceAssignment[]> {
    await this.assignmentValidationService.ensureResourceExists(resourceId);

    return this.assignmentsRepository.find({
      order: { createdAt: 'ASC', startDate: 'ASC' },
      where: { resourceId },
    });
  }

  private async findAssignmentOrThrow(
    assignmentId: string,
    manager?: Repository<ResourceAssignment>['manager'],
  ): Promise<ResourceAssignment> {
    const assignment = await (manager?.findOne(ResourceAssignment, {
      where: { id: assignmentId },
    }) ?? this.assignmentsRepository.findOne({ where: { id: assignmentId } }));

    if (!assignment) {
      throw new NotFoundException(
        `Resource assignment ${assignmentId} not found`,
      );
    }

    return assignment;
  }

  private async ensureProjectMutationAllowed(
    actor?: AuthorizationActor,
  ): Promise<void> {
    if (
      !actor ||
      (await this.authorizationPolicyService.canMutateProjectDomain(actor))
    ) {
      return;
    }

    throw new ForbiddenException({
      message: 'Project mutation is not permitted',
      reasonCode: 'MISSING_PERMISSION',
    });
  }
}
