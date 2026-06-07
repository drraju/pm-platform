import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { DashboardController } from '../src/modules/dashboard/dashboard.controller';
import { DashboardService } from '../src/modules/dashboard/dashboard.service';
import { PortfolioController } from '../src/modules/portfolio/portfolio.controller';
import { PortfolioService } from '../src/modules/portfolio/portfolio.service';
import { ProjectsController } from '../src/modules/projects/projects.controller';
import { ProjectsService } from '../src/modules/projects/projects.service';

describe('API contract', () => {
  let app: INestApplication;
  let document: OpenAPIObject;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController, PortfolioController, ProjectsController],
      providers: [
        {
          provide: DashboardService,
          useValue: { getMyDashboard: jest.fn() },
        },
        {
          provide: PortfolioService,
          useValue: { getSummary: jest.fn() },
        },
        {
          provide: ProjectsService,
          useValue: {},
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('PM Platform API')
        .setDescription('Enterprise project management platform API')
        .setVersion('1.0')
        .addBearerAuth()
        .build(),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('documents dashboard, portfolio, project list, and project workspace endpoints', () => {
    expect(document.paths['/dashboard/me']?.get).toBeDefined();
    expect(document.paths['/portfolio/summary']?.get).toBeDefined();
    expect(document.paths['/projects']?.get).toBeDefined();
    expect(document.paths['/projects/{id}']?.get).toBeDefined();
    expect(document.paths['/projects/{id}/risks']?.get).toBeDefined();
    expect(document.paths['/projects/{id}/issues']?.get).toBeDefined();
    expect(document.paths['/projects/{id}/assumptions']?.get).toBeDefined();
    expect(document.paths['/projects/{id}/dependencies']?.get).toBeDefined();
  });

  it('documents portfolio summary response', () => {
    expect(document.components?.schemas?.PortfolioSummaryDto?.properties).toEqual(
      expect.objectContaining({
        totalProjects: expect.objectContaining({ type: 'number' }),
        greenProjects: expect.objectContaining({ type: 'number' }),
        amberProjects: expect.objectContaining({ type: 'number' }),
        redProjects: expect.objectContaining({ type: 'number' }),
        projectsRequiringAttention: expect.objectContaining({
          type: 'array',
          items: expect.objectContaining({
            $ref: '#/components/schemas/PortfolioProjectAttentionDto',
          }),
        }),
        openRisksBySeverity: expect.objectContaining({
          $ref: '#/components/schemas/OpenRisksBySeverityDto',
        }),
        openIssuesByPriority: expect.objectContaining({
          $ref: '#/components/schemas/OpenIssuesByPriorityDto',
        }),
        overdueTasks: expect.objectContaining({
          $ref: '#/components/schemas/OverdueTasksDto',
        }),
        upcomingMilestones: expect.objectContaining({
          type: 'array',
          items: expect.objectContaining({
            $ref: '#/components/schemas/UpcomingMilestoneDto',
          }),
        }),
      }),
    );
    expect(document.components?.schemas?.OpenRisksBySeverityDto?.properties).toEqual(
      expect.objectContaining({
        critical: expect.objectContaining({ type: 'number' }),
        high: expect.objectContaining({ type: 'number' }),
        medium: expect.objectContaining({ type: 'number' }),
        low: expect.objectContaining({ type: 'number' }),
      }),
    );
    expect(document.components?.schemas?.OpenIssuesByPriorityDto?.properties).toEqual(
      expect.objectContaining({
        critical: expect.objectContaining({ type: 'number' }),
        high: expect.objectContaining({ type: 'number' }),
        medium: expect.objectContaining({ type: 'number' }),
        low: expect.objectContaining({ type: 'number' }),
      }),
    );
    expect(document.components?.schemas?.OverdueTasksDto?.properties).toEqual(
      expect.objectContaining({
        total: expect.objectContaining({ type: 'number' }),
        projects: expect.objectContaining({
          type: 'array',
          items: expect.objectContaining({
            $ref: '#/components/schemas/OverdueTaskProjectDto',
          }),
        }),
      }),
    );
    expect(document.components?.schemas?.OverdueTaskProjectDto?.properties).toEqual(
      expect.objectContaining({
        projectId: expect.objectContaining({ type: 'string' }),
        projectName: expect.objectContaining({ type: 'string' }),
        overdueTaskCount: expect.objectContaining({ type: 'number' }),
      }),
    );
    expect(document.components?.schemas?.UpcomingMilestoneDto?.properties).toEqual(
      expect.objectContaining({
        taskId: expect.objectContaining({ type: 'string' }),
        title: expect.objectContaining({ type: 'string' }),
        projectId: expect.objectContaining({ type: 'string' }),
        projectName: expect.objectContaining({ type: 'string' }),
        dueDate: expect.objectContaining({ type: 'string' }),
      }),
    );
    expect(
      document.components?.schemas?.PortfolioProjectAttentionDto?.properties,
    ).toEqual(
      expect.objectContaining({
        id: expect.objectContaining({ type: 'string' }),
        name: expect.objectContaining({ type: 'string' }),
        healthStatus: expect.objectContaining({
          enum: ['GREEN', 'AMBER', 'RED'],
        }),
        reasons: expect.objectContaining({ type: 'array' }),
      }),
    );
  });

  it('documents project health status and reasons', () => {
    expect(document.components?.schemas?.ProjectHealthDto).toEqual(
      expect.objectContaining({
        properties: expect.objectContaining({
          status: expect.objectContaining({
            enum: ['GREEN', 'AMBER', 'RED'],
          }),
          reasons: expect.objectContaining({
            type: 'array',
          }),
        }),
      }),
    );
  });

  it('documents health on dashboard and project responses', () => {
    expect(document.components?.schemas?.MeDashboardDto?.properties).toEqual(
      expect.objectContaining({
        health: expect.objectContaining({
          $ref: '#/components/schemas/ProjectHealthDto',
        }),
      }),
    );
    expect(document.components?.schemas?.DashboardProjectDto?.properties).toEqual(
      expect.objectContaining({
        health: expect.objectContaining({
          $ref: '#/components/schemas/ProjectHealthDto',
        }),
      }),
    );
    expect(document.components?.schemas?.Project?.properties).toEqual(
      expect.objectContaining({
        health: expect.objectContaining({
          $ref: '#/components/schemas/ProjectHealthDto',
        }),
      }),
    );
  });
});
