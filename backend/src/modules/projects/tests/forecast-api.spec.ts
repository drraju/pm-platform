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

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ForecastController],
      providers: [
        {
          provide: ForecastQueryService,
          useValue: { getHistory, getOverview },
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
    expect(document.paths).not.toHaveProperty('/planning/{projectId}/forecast');
    expect(document.components?.schemas).toHaveProperty('ForecastOverviewDto');
    expect(document.components?.schemas).toHaveProperty(
      'ForecastHistoryResponseDto',
    );
    expect(JSON.stringify(document.paths)).not.toContain(
      'PlanningScheduleSnapshot',
    );
  });

  it('requires project.read on both endpoints', () => {
    const controller = app.get(ForecastController);
    expect(
      // eslint-disable-next-line @typescript-eslint/unbound-method
      Reflect.getMetadata(PERMISSIONS_KEY, controller.getOverview),
    ).toEqual([PermissionKey.ProjectRead]);
    expect(
      // eslint-disable-next-line @typescript-eslint/unbound-method
      Reflect.getMetadata(PERMISSIONS_KEY, controller.getHistory),
    ).toEqual([PermissionKey.ProjectRead]);
  });
});

const projectId = '11111111-1111-4111-8111-111111111111';
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
