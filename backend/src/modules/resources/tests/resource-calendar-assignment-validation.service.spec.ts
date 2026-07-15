import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EnterpriseCalendar } from '../../calendars/entities/enterprise-calendar.entity';
import { CalendarStatus } from '../../calendars/enums/calendar-status.enum';
import { Resource } from '../entities/resource.entity';
import { ResourceStatus } from '../enums/resource-status.enum';
import { ResourceCalendarAssignmentValidationService } from '../resource-calendar-assignment-validation.service';

const resourceId = '11111111-1111-4111-8111-111111111111';
const calendarId = '22222222-2222-4222-8222-222222222222';

describe('ResourceCalendarAssignmentValidationService', () => {
  let service: ResourceCalendarAssignmentValidationService;
  let resourcesRepository: { findOne: jest.Mock };
  let calendarLookupService: { findCalendarReference: jest.Mock };

  beforeEach(() => {
    resourcesRepository = {
      findOne: jest.fn().mockResolvedValue(
        Object.assign(new Resource(), {
          id: resourceId,
          status: ResourceStatus.Active,
        }),
      ),
    };
    calendarLookupService = {
      findCalendarReference: jest.fn().mockResolvedValue(
        Object.assign(new EnterpriseCalendar(), {
          id: calendarId,
          status: CalendarStatus.Active,
        }),
      ),
    };
    service = new ResourceCalendarAssignmentValidationService(
      resourcesRepository as never,
      calendarLookupService as never,
    );
  });

  it('accepts an active Calendar for an existing Resource', async () => {
    const result = await service.validateAssignment({ calendarId, resourceId });

    expect(result.calendar.id).toBe(calendarId);
    expect(result.resource.id).toBe(resourceId);

    expect(calendarLookupService.findCalendarReference).toHaveBeenCalledWith(
      calendarId,
    );
  });

  it('accepts an archived Resource without changing its lifecycle', async () => {
    resourcesRepository.findOne.mockResolvedValue(
      Object.assign(new Resource(), {
        id: resourceId,
        status: ResourceStatus.Archived,
      }),
    );

    const result = await service.validateAssignment({ calendarId, resourceId });

    expect(result.resource.status).toBe(ResourceStatus.Archived);
  });

  it('rejects a missing Resource before Calendar lookup', async () => {
    resourcesRepository.findOne.mockResolvedValue(null);

    await expect(
      service.validateAssignment({ calendarId, resourceId }),
    ).rejects.toThrow(NotFoundException);

    expect(calendarLookupService.findCalendarReference).not.toHaveBeenCalled();
  });

  it('rejects a missing Calendar', async () => {
    calendarLookupService.findCalendarReference.mockResolvedValue(null);

    await expect(
      service.validateAssignment({ calendarId, resourceId }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects an archived Calendar', async () => {
    calendarLookupService.findCalendarReference.mockResolvedValue(
      Object.assign(new EnterpriseCalendar(), {
        id: calendarId,
        status: CalendarStatus.Archived,
      }),
    );

    await expect(
      service.validateAssignment({ calendarId, resourceId }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a soft-deleted Calendar', async () => {
    calendarLookupService.findCalendarReference.mockResolvedValue(
      Object.assign(new EnterpriseCalendar(), {
        deletedAt: new Date('2026-07-14T00:00:00.000Z'),
        id: calendarId,
        status: CalendarStatus.Active,
      }),
    );

    await expect(
      service.validateAssignment({ calendarId, resourceId }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects malformed domain identifiers before persistence lookup', async () => {
    await expect(
      service.validateAssignment({ calendarId: 'invalid', resourceId }),
    ).rejects.toThrow(BadRequestException);

    expect(resourcesRepository.findOne).not.toHaveBeenCalled();
    expect(calendarLookupService.findCalendarReference).not.toHaveBeenCalled();
  });

  it('rejects a malformed Resource identifier before any lookup', async () => {
    await expect(
      service.validateAssignment({ calendarId, resourceId: 'invalid' }),
    ).rejects.toThrow(BadRequestException);

    expect(resourcesRepository.findOne).not.toHaveBeenCalled();
    expect(calendarLookupService.findCalendarReference).not.toHaveBeenCalled();
  });

  it.each([
    ['clear', { resourceId }],
    ['retrieve', { resourceId }],
  ])(
    'validates an existing Resource for the %s path',
    async (_path, command) => {
      await expect(service.validateResourceCommand(command)).resolves.toEqual(
        expect.objectContaining({ id: resourceId }),
      );

      expect(resourcesRepository.findOne).toHaveBeenCalledWith({
        where: { id: resourceId },
      });
      expect(
        calendarLookupService.findCalendarReference,
      ).not.toHaveBeenCalled();
    },
  );

  it('rejects a missing Resource for a Resource-only command', async () => {
    resourcesRepository.findOne.mockResolvedValue(null);

    await expect(
      service.validateResourceCommand({ resourceId }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects a malformed Resource-only command before lookup', async () => {
    await expect(
      service.validateResourceCommand({ resourceId: 'invalid' }),
    ).rejects.toThrow(BadRequestException);

    expect(resourcesRepository.findOne).not.toHaveBeenCalled();
  });

  it('uses the transaction-manager Resource repository when provided', async () => {
    const transactionResource = Object.assign(new Resource(), {
      id: resourceId,
      status: ResourceStatus.Active,
    });
    const transactionRepository = {
      findOne: jest.fn().mockResolvedValue(transactionResource),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue(transactionRepository),
    };

    await expect(
      service.validateResourceCommand({ resourceId }, manager as never),
    ).resolves.toBe(transactionResource);

    expect(manager.getRepository).toHaveBeenCalledWith(Resource);
    expect(transactionRepository.findOne).toHaveBeenCalledWith({
      where: { id: resourceId },
    });
    expect(resourcesRepository.findOne).not.toHaveBeenCalled();
  });
});
