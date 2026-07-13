import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { AuthorizationPolicyService } from '../src/common/authz/authorization-policy.service';
import { PermissionsGuard } from '../src/common/authz/permissions.guard';
import { DashboardController } from '../src/modules/dashboard/dashboard.controller';
import { DashboardService } from '../src/modules/dashboard/dashboard.service';
import { ProjectsController } from '../src/modules/projects/projects.controller';
import { ProjectsService } from '../src/modules/projects/projects.service';

describe('API contract', () => {
  let app: INestApplication;
  let document: OpenAPIObject;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController, ProjectsController],
      providers: [
        {
          provide: DashboardService,
          useValue: { getMyDashboard: jest.fn() },
        },
        {
          provide: ProjectsService,
          useValue: {},
        },
        Reflector,
        PermissionsGuard,
        {
          provide: AuthorizationPolicyService,
          useValue: {
            getGrantedPermissionKeys: jest.fn().mockResolvedValue(new Set()),
          },
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

  it('documents dashboard, project list, and project workspace endpoints', () => {
    expect(document.paths['/dashboard/me']?.get).toBeDefined();
    expect(document.paths['/projects']?.get).toBeDefined();
    expect(document.paths['/projects/{id}']?.get).toBeDefined();
    expect(document.paths['/projects/{id}/risks']?.get).toBeDefined();
    expect(document.paths['/projects/{id}/issues']?.get).toBeDefined();
    expect(document.paths['/projects/{id}/assumptions']?.get).toBeDefined();
    expect(document.paths['/projects/{id}/dependencies']?.get).toBeDefined();
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
    expect(
      document.components?.schemas?.DashboardProjectDto?.properties,
    ).toEqual(
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
