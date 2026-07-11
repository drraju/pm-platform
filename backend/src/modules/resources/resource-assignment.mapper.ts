import {
  ResourceAssignmentResponseDto,
} from './dto/resource-assignment.dto';
import { ResourceAssignment } from './entities/resource-assignment.entity';
import { ResourceAssignmentStatus } from './enums/resource-assignment-status.enum';
import {
  CreateResourceAssignmentCommand,
  UpdateResourceAssignmentCommand,
} from './resource-assignment.commands';

export class ResourceAssignmentMapper {
  static toResponse(
    assignment: ResourceAssignment,
  ): ResourceAssignmentResponseDto {
    return {
      allocationPercent: assignment.allocationPercent ?? null,
      createdAt: assignment.createdAt,
      endDate: assignment.endDate,
      id: assignment.id,
      plannedMinutesPerDay: assignment.plannedMinutesPerDay ?? null,
      projectId: assignment.projectId,
      resourceId: assignment.resourceId,
      startDate: assignment.startDate,
      status: assignment.status,
      taskId: assignment.taskId ?? null,
      updatedAt: assignment.updatedAt,
    };
  }

  static toResponses(
    assignments: ResourceAssignment[],
  ): ResourceAssignmentResponseDto[] {
    return assignments.map((assignment) => this.toResponse(assignment));
  }

  static fromCreateCommand(
    input: CreateResourceAssignmentCommand,
  ): ResourceAssignment {
    return Object.assign(new ResourceAssignment(), {
      allocationPercent: input.allocationPercent ?? null,
      endDate: input.endDate,
      plannedMinutesPerDay: input.plannedMinutesPerDay ?? null,
      projectId: input.projectId,
      resourceId: input.resourceId,
      startDate: input.startDate,
      status: input.status ?? ResourceAssignmentStatus.Draft,
      taskId: input.taskId ?? null,
    });
  }

  static fromUpdateCommand(
    assignment: ResourceAssignment,
    input: UpdateResourceAssignmentCommand,
  ): ResourceAssignment {
    return Object.assign(new ResourceAssignment(), assignment, {
      allocationPercent:
        input.allocationPercent !== undefined
          ? (input.allocationPercent ?? null)
          : assignment.allocationPercent,
      endDate: input.endDate ?? assignment.endDate,
      plannedMinutesPerDay:
        input.plannedMinutesPerDay !== undefined
          ? (input.plannedMinutesPerDay ?? null)
          : assignment.plannedMinutesPerDay,
      projectId: input.projectId ?? assignment.projectId,
      resourceId: input.resourceId ?? assignment.resourceId,
      startDate: input.startDate ?? assignment.startDate,
      status: input.status ?? assignment.status,
      taskId:
        input.taskId !== undefined ? (input.taskId ?? null) : assignment.taskId,
    });
  }
}
