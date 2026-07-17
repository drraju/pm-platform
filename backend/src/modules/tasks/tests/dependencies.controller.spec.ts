import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  PERMISSIONS_KEY,
  PermissionKey,
} from '../../../common/authz/permissions';
import { PermissionsGuard } from '../../../common/authz/permissions.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  DependenciesController,
  ProjectDependenciesController,
} from '../dependencies.controller';
import { DependencyHealth } from '../dependency-domain';
import { DependencyQueryService } from '../dependency-query.service';
import { DependencyResponseMapper } from '../dependency-response.mapper';
import { projection } from './dependency-response.mapper.spec';

describe('dependency REST controllers', () => {
  const findDependencies = jest.fn();
  const findProjectDependencies = jest.fn();
  const service = {
    findDependencies,
    findProjectDependencies,
  };
  const mapper = new DependencyResponseMapper();
  const request = {
    user: { email: 'user@example.com', roleId: 'role-id', userId: 'user-id' },
  } as never;

  beforeEach(() => jest.clearAllMocks());

  it('delegates project collections through the query service and mapper', async () => {
    const page = {
      items: [projection()],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    };
    findProjectDependencies.mockResolvedValue(page);
    const controller = new ProjectDependenciesController(
      service as unknown as DependencyQueryService,
      mapper,
    );

    const response = await controller.findAll(request, 'project-id', {
      health: [DependencyHealth.Blocking],
      pageSize: 10,
    });

    expect(findProjectDependencies).toHaveBeenCalledWith(
      'project-id',
      expect.objectContaining({
        health: [DependencyHealth.Blocking],
        pageSize: 10,
      }),
      expect.objectContaining({ userId: 'user-id' }),
    );
    expect(response.items[0].id).toBe('dependency-id');
  });

  it('maps a visible global dependency lookup', async () => {
    findDependencies.mockResolvedValue({ items: [projection()] });
    const controller = new DependenciesController(
      service as unknown as DependencyQueryService,
      mapper,
    );

    await expect(
      controller.findOne(request, 'dependency-id'),
    ).resolves.toMatchObject({ id: 'dependency-id' });
    expect(findDependencies).toHaveBeenCalledWith(
      { dependencyIds: ['dependency-id'], pageSize: 1 },
      expect.objectContaining({ userId: 'user-id' }),
    );
  });

  it('maps an absent or hidden dependency to not found', async () => {
    findDependencies.mockResolvedValue({ items: [] });
    const controller = new DependenciesController(
      service as unknown as DependencyQueryService,
      mapper,
    );

    await expect(controller.findOne(request, 'hidden-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('reuses project.read RBAC metadata for both controllers', () => {
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, DependenciesController),
    ).toEqual([PermissionKey.ProjectRead]);
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, ProjectDependenciesController),
    ).toEqual([PermissionKey.ProjectRead]);
  });

  it('publishes dependency paths and DTO-only schemas in OpenAPI', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [DependenciesController, ProjectDependenciesController],
      providers: [
        { provide: DependencyQueryService, useValue: service },
        DependencyResponseMapper,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();
    const app = moduleRef.createNestApplication();
    await app.init();
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );

    expect(document.paths).toHaveProperty('/dependencies/{dependencyId}');
    expect(document.paths).toHaveProperty('/projects/{projectId}/dependencies');
    expect(document.components?.schemas).toHaveProperty(
      'DependencyResponseDto',
    );
    expect(document.components?.schemas).toHaveProperty(
      'DependencyCollectionResponseDto',
    );
    const serialized = JSON.stringify(document.paths);
    expect(serialized).toContain('DependencyCollectionResponseDto');
    expect(serialized).not.toContain('TaskDependency');
    await app.close();
  });
});
