import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Not, Repository } from 'typeorm';
import { Project } from '../projects/entities/project.entity';
import { Task } from '../tasks/entities/task.entity';
import {
  CreateResourceAssignmentCommand,
  UpdateResourceAssignmentCommand,
} from './resource-assignment.commands';
import { ResourceAssignment } from './entities/resource-assignment.entity';
import { ResourceAssignmentStatus } from './enums/resource-assignment-status.enum';
import { Resource } from './entities/resource.entity';

export type ResourceAssignmentValidationInput =
  | CreateResourceAssignmentCommand
  | UpdateResourceAssignmentCommand
  | Pick<
      ResourceAssignment,
      | 'allocationPercent'
      | 'endDate'
      | 'plannedMinutesPerDay'
      | 'projectId'
      | 'resourceId'
      | 'startDate'
      | 'status'
      | 'taskId'
    >;

@Injectable()
export class ResourceAssignmentValidationService {
  constructor(
    @InjectRepository(ResourceAssignment)
    private readonly assignmentsRepository: Repository<ResourceAssignment>,
    @InjectRepository(Resource)
    private readonly resourcesRepository: Repository<Resource>,
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
  ) {}

  async validateCreateAssignment(input: CreateResourceAssignmentCommand) {
    await this.validateAssignment(input, true);
  }

  async validateUpdateAssignment(input: UpdateResourceAssignmentCommand) {
    await this.validateAssignment(input, false);
  }

  async validateResolvedAssignment(
    input: ResourceAssignmentValidationInput,
    manager?: EntityManager,
  ) {
    await this.validateAssignment(input, true, manager);
  }

  async ensureAssignmentNotDuplicated(
    input: Pick<
      ResourceAssignment,
      'endDate' | 'projectId' | 'resourceId' | 'startDate' | 'taskId'
    >,
    assignmentId?: string,
    manager?: EntityManager,
  ) {
    const assignmentsRepository =
      manager?.getRepository(ResourceAssignment) ?? this.assignmentsRepository;
    const existingAssignment = await assignmentsRepository.findOne({
      where: {
        id: assignmentId ? Not(assignmentId) : undefined,
        projectId: input.projectId,
        resourceId: input.resourceId,
        startDate: input.startDate,
        endDate: input.endDate,
        taskId: input.taskId ?? IsNull(),
      },
    });

    if (existingAssignment) {
      throw new ConflictException('Resource assignment already exists');
    }
  }

  private async validateAssignment(
    input: ResourceAssignmentValidationInput,
    requireCommitment: boolean,
    manager?: EntityManager,
  ) {
    if (input.resourceId !== undefined) {
      await this.ensureResourceExists(input.resourceId, manager);
    }

    if (input.projectId !== undefined) {
      await this.ensureProjectExists(input.projectId, manager);
    }

    if (input.taskId !== undefined && input.taskId !== null) {
      await this.ensureTaskExists(input.taskId, manager);
    }

    if (
      input.allocationPercent !== undefined &&
      input.allocationPercent !== null
    ) {
      this.validateAllocationPercent(input.allocationPercent);
    }

    if (
      input.startDate !== undefined &&
      input.endDate !== undefined &&
      input.startDate !== null &&
      input.endDate !== null
    ) {
      this.validateDateRange(input.startDate, input.endDate);
    }

    if (input.status !== undefined && input.status !== null) {
      this.validateAllowedValue(
        input.status,
        Object.values(ResourceAssignmentStatus),
        'assignment status',
      );
    }

    this.validateCommitment(input, requireCommitment);
  }

  private validateCommitment(
    input: ResourceAssignmentValidationInput,
    requireCommitment: boolean,
  ) {
    const hasAllocation =
      input.allocationPercent !== undefined && input.allocationPercent !== null;
    const hasPlannedMinutes =
      input.plannedMinutesPerDay !== undefined &&
      input.plannedMinutesPerDay !== null;

    if (requireCommitment && !hasAllocation && !hasPlannedMinutes) {
      throw new BadRequestException(
        'Resource assignment requires allocation percent or planned minutes per day',
      );
    }

    const clearsAllocation = input.allocationPercent === null;
    const clearsPlannedMinutes = input.plannedMinutesPerDay === null;

    if (clearsAllocation && clearsPlannedMinutes) {
      throw new BadRequestException(
        'Resource assignment requires allocation percent or planned minutes per day',
      );
    }

    if (
      (clearsAllocation || clearsPlannedMinutes) &&
      !hasAllocation &&
      !hasPlannedMinutes
    ) {
      throw new BadRequestException(
        'Resource assignment requires allocation percent or planned minutes per day',
      );
    }
  }

  private validateAllocationPercent(value: number) {
    if (value < 0 || value > 100) {
      throw new BadRequestException(
        'Resource assignment allocation percent must be between 0 and 100',
      );
    }
  }

  private validateDateRange(startDate: string, endDate: string) {
    if (new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException(
        'Resource assignment start date must be on or before end date',
      );
    }
  }

  private validateAllowedValue(
    value: string,
    allowedValues: string[],
    fieldName: string,
  ) {
    if (!allowedValues.includes(value)) {
      throw new BadRequestException(`Unsupported resource ${fieldName}`);
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

  async ensureProjectExists(projectId: string, manager?: EntityManager) {
    const project = await (
      manager?.getRepository(Project) ?? this.projectsRepository
    ).findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
  }

  async ensureTaskExists(taskId: string, manager?: EntityManager) {
    const task = await (
      manager?.getRepository(Task) ?? this.tasksRepository
    ).findOne({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }
  }
}
