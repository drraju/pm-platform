import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import request from 'supertest';
import { MilestoneCategory } from '../../../common/enums/milestone-category.enum';
import { PlanningCalculationStatus } from '../../../common/enums/planning-calculation-status.enum';
import { PermissionsGuard } from '../../../common/authz/permissions.guard';
import {
  PERMISSIONS_KEY,
  PermissionKey,
} from '../../../common/authz/permissions';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { MilestoneQueryService } from '../../tasks/milestone-query.service';
import { MilestoneResponseMapper } from '../../tasks/milestone-response.mapper';
import { ProjectsController } from '../projects.controller';
import { ProjectsService } from '../projects.service';

describe('Milestone REST API', () => {
  let app: INestApplication;
  const findProjectMilestones = jest.fn();
  const findProjectMilestone = jest.fn();

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        { provide: ProjectsService, useValue: {} },
        {
          provide: MilestoneQueryService,
          useValue: { findProjectMilestone, findProjectMilestones },
        },
        MilestoneResponseMapper,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(new AuthenticatedGuard())
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
    jest.clearAllMocks();
  });

  afterEach(() => app.close());

  it('returns a paginated, filtered public milestone response', async () => {
    findProjectMilestones.mockResolvedValue({
      items: [projection()],
      page: 1,
      pageSize: 10,
      total: 1,
    });

    const response = await request(app.getHttpServer())
      .get(
        '/projects/11111111-1111-4111-8111-111111111111/milestones?category=release&critical=true&pageSize=10',
      )
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({ page: 1, total: 1, totalPages: 1 }),
    );
    expect(response.body.items[0]).not.toHaveProperty('taskStatus');
    expect(findProjectMilestones).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      expect.objectContaining({
        category: MilestoneCategory.Release,
        critical: true,
        pageSize: 10,
      }),
      expect.objectContaining({ userId: 'user-id' }),
    );
  });

  it('returns one milestone', async () => {
    findProjectMilestone.mockResolvedValue(projection());
    await request(app.getHttpServer())
      .get(
        '/projects/11111111-1111-4111-8111-111111111111/milestones/22222222-2222-4222-8222-222222222222',
      )
      .expect(200)
      .expect(({ body }) => expect(body.taskId).toBe('milestone-id'));
  });

  it('preserves the existing application error contract', async () => {
    findProjectMilestone.mockRejectedValue(
      new NotFoundException('Milestone missing'),
    );
    const response = await request(app.getHttpServer())
      .get(
        '/projects/11111111-1111-4111-8111-111111111111/milestones/22222222-2222-4222-8222-222222222222',
      )
      .expect(404);
    expect(response.body).toEqual(
      expect.objectContaining({ error: 'Not Found', statusCode: 404 }),
    );
  });

  it('returns the platform validation error contract for invalid filters', async () => {
    const response = await request(app.getHttpServer())
      .get(
        '/projects/11111111-1111-4111-8111-111111111111/milestones?pageSize=101',
      )
      .expect(400);

    expect(response.body).toEqual(
      expect.objectContaining({ error: 'Bad Request', statusCode: 400 }),
    );
  });

  it('publishes the milestone paths and public schemas in OpenAPI', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );
    expect(document.paths).toHaveProperty('/projects/{projectId}/milestones');
    expect(document.paths).toHaveProperty(
      '/projects/{projectId}/milestones/{taskId}',
    );
    expect(document.components?.schemas).toHaveProperty('MilestoneResponseDto');
    const milestoneOperation =
      document.paths['/projects/{projectId}/milestones']?.get;
    expect(JSON.stringify(milestoneOperation)).toContain(
      'MilestoneListResponseDto',
    );
    expect(JSON.stringify(milestoneOperation)).not.toContain(
      '"#/components/schemas/Task"',
    );
  });

  it('reuses project.read authorization metadata', () => {
    const controller = app.get(ProjectsController);
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, controller.findProjectMilestones),
    ).toEqual([PermissionKey.ProjectRead]);
  });
});

class AuthenticatedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    context.switchToHttp().getRequest().user = {
      email: 'user@example.com',
      roleId: 'role-id',
      userId: 'user-id',
    };
    return true;
  }
}

function projection() {
  return {
    actualDate: null,
    baselineDate: '2026-07-20',
    calculatedAt: new Date('2026-07-16T10:00:00Z'),
    calculationStatus: PlanningCalculationStatus.Calculated,
    category: MilestoneCategory.Release,
    critical: true,
    daysRemaining: 4,
    forecastDate: '2026-07-20',
    id: 'milestone-id',
    overdue: false,
    owner: null,
    plannedDate: '2026-07-20',
    projectId: '11111111-1111-4111-8111-111111111111',
    state: 'upcoming' as const,
    taskId: 'milestone-id',
    taskStatus: 'todo' as never,
    title: 'Release',
    varianceDays: 0,
  };
}
