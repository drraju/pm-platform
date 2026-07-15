import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationActor } from '../../common/authz/authorization-policy.service';
import { EnterpriseCalendar } from '../calendars/entities/enterprise-calendar.entity';
import { EnterpriseCalendarLookupService } from '../calendars/enterprise-calendar-lookup.service';
import { Resource } from './entities/resource.entity';
import {
  AssignCalendarCommand,
  ClearCalendarAssignmentCommand,
  RetrieveCalendarAssignmentCommand,
} from './resource-calendar-assignment.commands';
import { ResourceCalendarAssignmentValidationService } from './resource-calendar-assignment-validation.service';

@Injectable()
export class ResourceCalendarAssignmentService {
  constructor(
    @InjectRepository(Resource)
    private readonly resourcesRepository: Repository<Resource>,
    private readonly validationService: ResourceCalendarAssignmentValidationService,
    private readonly calendarLookupService: EnterpriseCalendarLookupService,
  ) {}

  assignCalendar(
    command: AssignCalendarCommand,
    actor?: AuthorizationActor,
  ): Promise<Resource> {
    return this.setCalendar(command, actor);
  }

  replaceCalendar(
    command: AssignCalendarCommand,
    actor?: AuthorizationActor,
  ): Promise<Resource> {
    return this.setCalendar(command, actor);
  }

  async clearCalendarAssignment(
    command: ClearCalendarAssignmentCommand,
    actor?: AuthorizationActor,
  ): Promise<Resource> {
    return this.resourcesRepository.manager.transaction(async (manager) => {
      const resource = await this.validationService.validateResourceCommand(
        command,
        manager,
      );

      if (resource.calendarId === null || resource.calendarId === undefined) {
        return resource;
      }

      resource.calendarId = null;
      resource.calendar = null;
      resource.updatedById = actor?.userId;

      return manager.save(Resource, resource);
    });
  }

  async getAssignedCalendar(
    command: RetrieveCalendarAssignmentCommand,
  ): Promise<EnterpriseCalendar | null> {
    const resource =
      await this.validationService.validateResourceCommand(command);

    if (!resource.calendarId) {
      return null;
    }

    const calendar = await this.calendarLookupService.findCalendarReference(
      resource.calendarId,
    );

    if (!calendar) {
      throw new NotFoundException(
        `Assigned enterprise calendar ${resource.calendarId} not found`,
      );
    }

    return calendar;
  }

  private async setCalendar(
    command: AssignCalendarCommand,
    actor?: AuthorizationActor,
  ): Promise<Resource> {
    return this.resourcesRepository.manager.transaction(async (manager) => {
      const { resource } = await this.validationService.validateAssignment(
        command,
        manager,
      );

      if (resource.calendarId === command.calendarId) {
        return resource;
      }

      resource.calendarId = command.calendarId;
      resource.updatedById = actor?.userId;

      return manager.save(Resource, resource);
    });
  }
}
