import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../projects/entities/project.entity';
import { Task } from '../tasks/entities/task.entity';
import {
  CreateResourceAssignmentDto,
  UpdateResourceAssignmentDto,
} from './dto/resource-assignment.dto';
import { ResourceAssignmentStatus } from './enums/resource-assignment-status.enum';
import { Resource } from './entities/resource.entity';

type ResourceAssignmentValidationInput =
  | CreateResourceAssignmentDto
  | UpdateResourceAssignmentDto;

@Injectable()
export class ResourceAssignmentValidationService {
  constructor(
    @InjectRepository(Resource)
    private readonly resourcesRepository: Repository<Resource>,
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
  ) {}

  async validateCreateAssignment(input: CreateResourceAssignmentDto) {
    await this.validateAssignment(input, true);
  }

  async validateUpdateAssignment(input: UpdateResourceAssignmentDto) {
    await this.validateAssignment(input, false);
  }

  private async validateAssignment(
    input: ResourceAssignmentValidationInput,
    requireCommitment: boolean,
  ) {
    if (input.resourceId !== undefined) {
      await this.ensureResourceExists(input.resourceId);
    }

    if (input.projectId !== undefined) {
      await this.ensureProjectExists(input.projectId);
    }

    if (input.taskId !== undefined && input.taskId !== null) {
      await this.ensureTaskExists(input.taskId);
    }

    if (input.allocationPercent !== undefined && input.allocationPercent !== null) {
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

  private async ensureResourceExists(resourceId: string) {
    const resource = await this.resourcesRepository.findOne({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new NotFoundException(`Resource ${resourceId} not found`);
    }
  }

  private async ensureProjectExists(projectId: string) {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
  }

  private async ensureTaskExists(taskId: string) {
    const task = await this.tasksRepository.findOne({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }
  }
}
