import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Server } from 'node:http';
import request from 'supertest';
import {
  PERMISSIONS_KEY,
  PermissionKey,
} from '../../../common/authz/permissions';
import { PermissionsGuard } from '../../../common/authz/permissions.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkingOutputState } from '../dto/forecast-read.dto';
import { ForecastController } from '../forecast.controller';
import { ForecastQueryService } from '../forecast-query.service';

describe('Forecast REST API', () => {
  let app: INestApplication;
  let httpServer: Server;
  const getOverview = jest.fn();
  const getHistory = jest.fn();
  const getSnapshotDetail = jest.fn();

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ForecastController],
      providers: [
        {
          provide: ForecastQueryService,
          useValue: { getHistory, getOverview, getSnapshotDetail },
        },
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
    httpServer = app.getHttpServer() as Server;
    jest.clearAllMocks();
  });

  afterEach(() => app.close());

  it('exposes the canonical project-scoped overview endpoint', async () => {
    getOverview.mockResolvedValue({
      activeBaseline: null,
      availability: {
        activeBaseline: false,
        currentForecast: false,
        originalBaseline: false,
        previousForecast: false,
      },
      currentForecast: null,
      finishVarianceFromCurrentActiveBaselineDays: null,
      finishVarianceFromPreviousDays: null,
      originalBaseline: null,
      previousForecast: null,
      projectId: projectId,
      warnings: [],
      workingOutputState: WorkingOutputState.NotRequested,
    });

    const response = await request(httpServer)
      .get(`/projects/${projectId}/forecast`)
      .expect(200);
    const body = response.body as {
      projectId: string;
      workingOutputState: string;
    };
    expect(body.projectId).toBe(projectId);
    expect(body.workingOutputState).toBe('not_requested');
    expect(getOverview).toHaveBeenCalledWith(projectId, actor);
  });

  it('transforms keyset history pagination parameters', async () => {
    getHistory.mockResolvedValue({
      hasMore: false,
      items: [],
      nextCursor: null,
    });

    await request(httpServer)
      .get(`/projects/${projectId}/forecast/history?beforeVersion=8&limit=10`)
      .expect(200);
    expect(getHistory).toHaveBeenCalledWith(
      projectId,
      { beforeVersion: 8, limit: 10 },
      actor,
    );
  });

  it('exposes one historical Forecast snapshot by its canonical UUID', async () => {
    getSnapshotDetail.mockResolvedValue({
      snapshot: {
        calculatedAt: '2026-08-02T10:00:00.000Z',
        calculationStatus: 'calculated',
        criticalTaskCount: 1,
        generatedBy: { id: actor.userId, name: 'Forecast Manager' },
        isCurrent: false,
        milestoneCount: 0,
        projectFinishDate: '2026-08-05',
        projectId,
        projectStartDate: '2026-08-01',
        scheduleAnchorDate: '2026-08-01',
        scheduleVersion: 2,
        snapshotId,
        taskCount: 1,
        unscheduledExecutableTaskCount: 0,
      },
      taskSchedules: [
        {
          durationDays: 4,
          isCritical: true,
          milestoneCategory: null,
          parentTaskId: null,
          scheduledEndDate: '2026-08-05',
          scheduledStartDate: '2026-08-01',
          sequenceNumber: 1,
          taskId: null,
          taskKind: 'standard',
          taskTitle: 'Captured task',
        },
      ],
    });

    const response = await request(httpServer)
      .get(`/projects/${projectId}/forecast/history/${snapshotId}`)
      .expect(200);
    const body = response.body as {
      snapshot: { snapshotId: string };
      taskSchedules: Array<{ taskId: string | null; taskTitle: string }>;
    };

    expect(body.snapshot.snapshotId).toBe(snapshotId);
    expect(body.taskSchedules).toHaveLength(1);
    expect(body.taskSchedules[0]?.taskId).toBeNull();
    expect(body.taskSchedules[0]?.taskTitle).toBe('Captured task');
    expect(getSnapshotDetail).toHaveBeenCalledWith(
      projectId,
      snapshotId,
      actor,
    );
  });

  it.each([
    'limit=0',
    'limit=101',
    'limit=not-a-number',
    'beforeVersion=0',
    'page=2',
  ])('rejects invalid or unsupported history query %s', async (query) => {
    await request(httpServer)
      .get(`/projects/${projectId}/forecast/history?${query}`)
      .expect(400);
  });

  it('publishes only the canonical Forecast paths and dedicated DTOs', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );
    expect(document.paths).toHaveProperty('/projects/{projectId}/forecast');
    expect(document.paths).toHaveProperty(
      '/projects/{projectId}/forecast/history',
    );
    expect(document.paths).toHaveProperty(
      '/projects/{projectId}/forecast/history/{snapshotId}',
    );
    expect(document.paths).not.toHaveProperty('/planning/{projectId}/forecast');
    expect(document.components?.schemas).toHaveProperty('ForecastOverviewDto');
    expect(document.components?.schemas).toHaveProperty(
      'ForecastHistoryResponseDto',
    );
    expect(document.components?.schemas).toHaveProperty(
      'ForecastSnapshotDetailDto',
    );
    expect(document.components?.schemas).toHaveProperty(
      'ForecastSnapshotTaskScheduleDto',
    );
    expect(JSON.stringify(document.paths)).not.toContain(
      'PlanningScheduleSnapshot',
    );
  });

  it('requires project.read on every Forecast endpoint', () => {
    const controller = app.get(ForecastController);
    expect(
      // eslint-disable-next-line @typescript-eslint/unbound-method
      Reflect.getMetadata(PERMISSIONS_KEY, controller.getOverview),
    ).toEqual([PermissionKey.ProjectRead]);
    expect(
      // eslint-disable-next-line @typescript-eslint/unbound-method
      Reflect.getMetadata(PERMISSIONS_KEY, controller.getHistory),
    ).toEqual([PermissionKey.ProjectRead]);
    expect(
      // eslint-disable-next-line @typescript-eslint/unbound-method
      Reflect.getMetadata(PERMISSIONS_KEY, controller.getSnapshotDetail),
    ).toEqual([PermissionKey.ProjectRead]);
  });
});

const projectId = '11111111-1111-4111-8111-111111111111';
const snapshotId = '33333333-3333-4333-8333-333333333333';
const actor = {
  email: 'manager@example.com',
  roleId: 'manager-role',
  userId: '22222222-2222-4222-8222-222222222222',
};

class AuthenticatedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    context.switchToHttp().getRequest<{ user: typeof actor }>().user = actor;
    return true;
  }
}
