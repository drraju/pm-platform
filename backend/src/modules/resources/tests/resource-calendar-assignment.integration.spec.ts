/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { PermissionsGuard } from '../../../common/authz/permissions.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { EnterpriseCalendar } from '../../calendars/entities/enterprise-calendar.entity';
import { CalendarStatus } from '../../calendars/enums/calendar-status.enum';
import { EnterpriseCalendarLookupService } from '../../calendars/enterprise-calendar-lookup.service';
import { Resource } from '../entities/resource.entity';
import { ResourceStatus } from '../enums/resource-status.enum';
import { ResourceType } from '../enums/resource-type.enum';
import { ResourceCalendarAssignmentApiService } from '../resource-calendar-assignment-api.service';
import { ResourceCalendarAssignmentController } from '../resource-calendar-assignment.controller';
import { ResourceCalendarAssignmentService } from '../resource-calendar-assignment.service';
import { ResourceCalendarAssignmentValidationService } from '../resource-calendar-assignment-validation.service';
import { ResourceService } from '../resource.service';
import { ResourceValidationService } from '../resource-validation.service';

const resourceId = '11111111-1111-4111-8111-111111111111';
const calendarId = '22222222-2222-4222-8222-222222222222';
const replacementCalendarId = '33333333-3333-4333-8333-333333333333';
const archivedCalendarId = '44444444-4444-4444-8444-444444444444';
const deletedCalendarId = '55555555-5555-4555-8555-555555555555';

class ResourceRepository {
  readonly rows = new Map<string, Resource>();
  manager: {
    getRepository: (entity: typeof Resource) => ResourceRepository;
    save: (entity: typeof Resource, resource: Resource) => Promise<Resource>;
    transaction: <T>(
      callback: (manager: ResourceRepository['manager']) => Promise<T>,
    ) => Promise<T>;
  };

  constructor() {
    this.manager = {
      getRepository: () => this,
      save: (_entity, resource) => this.save(resource),
      transaction: (callback) => callback(this.manager),
    };
  }

  findOne(options: { where: { id: string } }): Promise<Resource | null> {
    const resource = this.rows.get(options.where.id);
    return Promise.resolve(resource && !resource.deletedAt ? resource : null);
  }

  save(resource: Resource): Promise<Resource> {
    const now = new Date('2026-07-14T00:00:00.000Z');
    resource.createdAt ??= now;
    resource.updatedAt = now;
    this.rows.set(resource.id, resource);
    return Promise.resolve(resource);
  }
}

class CalendarRepository {
  readonly rows = new Map<string, EnterpriseCalendar>();

  findOne(options: {
    where: { id: string };
    withDeleted?: boolean;
  }): Promise<EnterpriseCalendar | null> {
    const calendar = this.rows.get(options.where.id);
    if (!calendar || (calendar.deletedAt && !options.withDeleted)) {
      return Promise.resolve(null);
    }
    return Promise.resolve(calendar);
  }
}

describe('Resource Calendar Assignment API integration', () => {
  let app: INestApplication;
  let resourcesRepository: ResourceRepository;
  let calendarsRepository: CalendarRepository;

  beforeEach(async () => {
    resourcesRepository = new ResourceRepository();
    calendarsRepository = new CalendarRepository();

    await resourcesRepository.save(
      Object.assign(new Resource(), {
        calendarId: null,
        id: resourceId,
        name: 'Calendar Resource',
        resourceType: ResourceType.Human,
        status: ResourceStatus.Active,
      }),
    );
    for (const calendar of [
      createCalendar(calendarId, 'Primary Calendar', CalendarStatus.Active),
      createCalendar(
        replacementCalendarId,
        'Replacement Calendar',
        CalendarStatus.Active,
      ),
      createCalendar(
        archivedCalendarId,
        'Archived Calendar',
        CalendarStatus.Archived,
      ),
      Object.assign(
        createCalendar(
          deletedCalendarId,
          'Deleted Calendar',
          CalendarStatus.Active,
        ),
        { deletedAt: new Date('2026-07-13T00:00:00.000Z') },
      ),
    ]) {
      calendarsRepository.rows.set(calendar.id, calendar);
    }

    const moduleRef = await Test.createTestingModule({
      controllers: [ResourceCalendarAssignmentController],
      providers: [
        ResourceCalendarAssignmentApiService,
        ResourceCalendarAssignmentService,
        ResourceCalendarAssignmentValidationService,
        ResourceService,
        ResourceValidationService,
        EnterpriseCalendarLookupService,
        {
          provide: getRepositoryToken(Resource),
          useValue: resourcesRepository,
        },
        {
          provide: getRepositoryToken(EnterpriseCalendar),
          useValue: calendarsRepository,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: {
          switchToHttp: () => { getRequest: () => Record<string, unknown> };
        }) => {
          context.switchToHttp().getRequest().user = {
            email: 'admin@example.com',
            roleId: 'admin-role-id',
            userId: '66666666-6666-4666-8666-666666666666',
          };
          return true;
        },
      })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('assigns, retrieves, replaces, and clears a Resource Calendar', async () => {
    await request(app.getHttpServer())
      .get(`/resources/${resourceId}/calendar`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.assignmentState).toBe('unassigned');
      });

    await request(app.getHttpServer())
      .put(`/resources/${resourceId}/calendar`)
      .send({ calendarId })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            assignedCalendarId: calendarId,
            calendarName: 'Primary Calendar',
            effectiveCalendarId: calendarId,
          }),
        );
      });

    await request(app.getHttpServer())
      .get(`/resources/${resourceId}/calendar`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.assignedCalendarId).toBe(calendarId);
      });

    await request(app.getHttpServer())
      .put(`/resources/${resourceId}/calendar`)
      .send({ calendarId: replacementCalendarId })
      .expect(200)
      .expect(({ body }) => {
        expect(body.assignedCalendarId).toBe(replacementCalendarId);
        expect(body.calendarName).toBe('Replacement Calendar');
      });

    await request(app.getHttpServer())
      .delete(`/resources/${resourceId}/calendar`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/resources/${resourceId}/calendar`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.assignmentState).toBe('unassigned');
        expect(body.assignedCalendarId).toBeNull();
      });
  });

  it('returns 404 for unknown Resources and Calendars', async () => {
    await request(app.getHttpServer())
      .get('/resources/77777777-7777-4777-8777-777777777777/calendar')
      .expect(404);
    await request(app.getHttpServer())
      .put(`/resources/${resourceId}/calendar`)
      .send({ calendarId: '88888888-8888-4888-8888-888888888888' })
      .expect(404);
  });

  it('returns 400 for malformed routes and payloads', async () => {
    await request(app.getHttpServer())
      .get('/resources/not-a-uuid/calendar')
      .expect(400);
    await request(app.getHttpServer())
      .put(`/resources/${resourceId}/calendar`)
      .send({ calendarId: 'not-a-uuid' })
      .expect(400);
    await request(app.getHttpServer())
      .put(`/resources/${resourceId}/calendar`)
      .send({})
      .expect(400);
  });

  it('rejects archived and soft-deleted Calendars', async () => {
    await request(app.getHttpServer())
      .put(`/resources/${resourceId}/calendar`)
      .send({ calendarId: archivedCalendarId })
      .expect(400);
    await request(app.getHttpServer())
      .put(`/resources/${resourceId}/calendar`)
      .send({ calendarId: deletedCalendarId })
      .expect(400);
  });
});

function createCalendar(
  id: string,
  name: string,
  status: CalendarStatus,
): EnterpriseCalendar {
  return Object.assign(new EnterpriseCalendar(), { id, name, status });
}
