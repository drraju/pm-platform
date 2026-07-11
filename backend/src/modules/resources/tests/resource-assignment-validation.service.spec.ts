import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ResourceAssignmentValidationService } from '../resource-assignment-validation.service';
import { ResourceAssignmentStatus } from '../enums/resource-assignment-status.enum';

describe('ResourceAssignmentValidationService', () => {
  let service: ResourceAssignmentValidationService;
  let assignmentsRepository: { findOne: jest.Mock };
  let resourcesRepository: { findOne: jest.Mock };
  let projectsRepository: { findOne: jest.Mock };
  let tasksRepository: { findOne: jest.Mock };

  beforeEach(() => {
    assignmentsRepository = { findOne: jest.fn() };
    resourcesRepository = { findOne: jest.fn() };
    projectsRepository = { findOne: jest.fn() };
    tasksRepository = { findOne: jest.fn() };

    service = new ResourceAssignmentValidationService(
      assignmentsRepository as never,
      resourcesRepository as never,
      projectsRepository as never,
      tasksRepository as never,
    );
  });

  it('accepts a valid create assignment input', async () => {
    resourcesRepository.findOne.mockResolvedValue({ id: 'resource-id' });
    projectsRepository.findOne.mockResolvedValue({ id: 'project-id' });
    tasksRepository.findOne.mockResolvedValue({ id: 'task-id' });

    await expect(
      service.validateCreateAssignment({
        allocationPercent: 50,
        endDate: '2026-07-18',
        projectId: 'project-id',
        resourceId: 'resource-id',
        startDate: '2026-07-11',
        status: ResourceAssignmentStatus.Active,
        taskId: 'task-id',
      }),
    ).resolves.toBeUndefined();
  });

  it('rejects missing commitment values on create', async () => {
    resourcesRepository.findOne.mockResolvedValue({ id: 'resource-id' });
    projectsRepository.findOne.mockResolvedValue({ id: 'project-id' });

    await expect(
      service.validateCreateAssignment({
        endDate: '2026-07-18',
        projectId: 'project-id',
        resourceId: 'resource-id',
        startDate: '2026-07-11',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects out-of-range allocation and inverted dates', async () => {
    resourcesRepository.findOne.mockResolvedValue({ id: 'resource-id' });
    projectsRepository.findOne.mockResolvedValue({ id: 'project-id' });

    await expect(
      service.validateCreateAssignment({
        allocationPercent: 120,
        endDate: '2026-07-11',
        projectId: 'project-id',
        resourceId: 'resource-id',
        startDate: '2026-07-18',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects unsupported status values', async () => {
    await expect(
      service.validateUpdateAssignment({
        status: 'unsupported' as ResourceAssignmentStatus,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects missing related records', async () => {
    resourcesRepository.findOne.mockResolvedValue(null);

    await expect(
      service.validateCreateAssignment({
        allocationPercent: 25,
        endDate: '2026-07-18',
        projectId: 'project-id',
        resourceId: 'resource-id',
        startDate: '2026-07-11',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects clearing both commitment values in an update', async () => {
    await expect(
      service.validateUpdateAssignment({
        allocationPercent: null,
        plannedMinutesPerDay: null,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects duplicate assignments', async () => {
    assignmentsRepository.findOne.mockResolvedValue({ id: 'assignment-id' });

    await expect(
      service.ensureAssignmentNotDuplicated({
        endDate: '2026-07-18',
        projectId: 'project-id',
        resourceId: 'resource-id',
        startDate: '2026-07-11',
        taskId: null,
      }),
    ).rejects.toThrow('Resource assignment already exists');
  });
});
