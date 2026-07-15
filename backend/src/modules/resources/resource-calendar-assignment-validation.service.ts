import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { EnterpriseCalendar } from '../calendars/entities/enterprise-calendar.entity';
import { CalendarStatus } from '../calendars/enums/calendar-status.enum';
import { EnterpriseCalendarLookupService } from '../calendars/enterprise-calendar-lookup.service';
import { Resource } from './entities/resource.entity';
import {
  AssignCalendarCommand,
  ClearCalendarAssignmentCommand,
  RetrieveCalendarAssignmentCommand,
} from './resource-calendar-assignment.commands';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class ResourceCalendarAssignmentValidationService {
  constructor(
    @InjectRepository(Resource)
    private readonly resourcesRepository: Repository<Resource>,
    private readonly calendarLookupService: EnterpriseCalendarLookupService,
  ) {}

  async validateAssignment(
    command: AssignCalendarCommand,
    manager?: EntityManager,
  ): Promise<{ calendar: EnterpriseCalendar; resource: Resource }> {
    this.validateUuid(command.resourceId, 'Resource id');
    this.validateUuid(command.calendarId, 'Calendar id');

    const resource = await this.ensureResourceExists(
      command.resourceId,
      manager,
    );
    const calendar = await this.ensureCalendarAssignable(command.calendarId);

    return { calendar, resource };
  }

  async validateResourceCommand(
    command: ClearCalendarAssignmentCommand | RetrieveCalendarAssignmentCommand,
    manager?: EntityManager,
  ): Promise<Resource> {
    this.validateUuid(command.resourceId, 'Resource id');
    return this.ensureResourceExists(command.resourceId, manager);
  }

  async ensureResourceExists(
    resourceId: string,
    manager?: EntityManager,
  ): Promise<Resource> {
    const resource = await (
      manager?.getRepository(Resource) ?? this.resourcesRepository
    ).findOne({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new NotFoundException(`Resource ${resourceId} not found`);
    }

    return resource;
  }

  async ensureCalendarAssignable(
    calendarId: string,
  ): Promise<EnterpriseCalendar> {
    const calendar =
      await this.calendarLookupService.findCalendarReference(calendarId);

    if (!calendar) {
      throw new NotFoundException(
        `Enterprise calendar ${calendarId} not found`,
      );
    }

    if (calendar.deletedAt) {
      throw new BadRequestException(
        `Enterprise calendar ${calendarId} is soft deleted`,
      );
    }

    if (calendar.status !== CalendarStatus.Active) {
      throw new BadRequestException(
        `Enterprise calendar ${calendarId} is not active`,
      );
    }

    return calendar;
  }

  private validateUuid(value: string, fieldLabel: string) {
    if (!uuidPattern.test(value)) {
      throw new BadRequestException(`${fieldLabel} must be a UUID`);
    }
  }
}
