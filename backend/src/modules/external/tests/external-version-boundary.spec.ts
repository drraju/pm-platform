import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { AppModule } from '../../../app.module';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ExternalApiGuard } from '../auth/external-api.guard';
import { EXTERNAL_API_RESOURCE_KEY } from '../auth/external-api-resource.decorator';
import {
  ExternalApiResource,
  externalV1ReadEndpoints,
} from '../auth/external-api-resource';
import {
  EXTERNAL_API_VERSION_POLICY,
  EXTERNAL_V1_BASE_PATH,
} from '../external.constants';
import { ExternalModule } from '../external.module';
import { ExternalV1Controller } from '../external-v1.controller';
import { ExternalApiAccessLoggingGuard } from '../logging/external-api-access-logging.guard';

describe('external v1 boundary', () => {
  it('registers a dedicated external module under exactly /external/v1', () => {
    const appImports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      AppModule,
    ) as unknown[] | undefined;
    const controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      ExternalModule,
    ) as unknown[] | undefined;

    expect(appImports).toContain(ExternalModule);
    expect(controllers).toEqual([ExternalV1Controller]);
    expect(Reflect.getMetadata(PATH_METADATA, ExternalV1Controller)).toBe(
      EXTERNAL_V1_BASE_PATH,
    );
    expect(EXTERNAL_V1_BASE_PATH).toBe('external/v1');
  });

  it('applies JWT and external policy guards to the complete boundary', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, ExternalV1Controller)).toEqual([
      ExternalApiAccessLoggingGuard,
      JwtAuthGuard,
      ExternalApiGuard,
    ]);
  });

  it('defines only the approved future GET permission mappings under v1', () => {
    expect(externalV1ReadEndpoints).toEqual([
      expect.objectContaining({
        method: 'GET',
        path: '/external/v1/issues',
        resource: ExternalApiResource.Issues,
      }),
      expect.objectContaining({
        method: 'GET',
        path: '/external/v1/projects',
        resource: ExternalApiResource.Projects,
      }),
      expect.objectContaining({
        method: 'GET',
        path: '/external/v1/risks',
        resource: ExternalApiResource.Risks,
      }),
      expect.objectContaining({
        method: 'GET',
        path: '/external/v1/tasks',
        resource: ExternalApiResource.Tasks,
      }),
    ]);
    expect(
      externalV1ReadEndpoints.every(
        ({ method, path }) =>
          method === 'GET' && path.startsWith('/external/v1/'),
      ),
    ).toBe(true);
    expect(EXTERNAL_API_VERSION_POLICY).toEqual({
      backwardCompatibleOptionalFields: 'v1',
      breakingChanges: 'v2',
    });
  });

  it('exposes exactly the four approved read-only handlers', () => {
    const handlers = Object.getOwnPropertyNames(
      ExternalV1Controller.prototype,
    ).filter((name) => name !== 'constructor');

    expect(handlers.sort()).toEqual(
      ['findIssues', 'findProjects', 'findRisks', 'findTasks'].sort(),
    );
    expect(handlerContract('findProjects')).toEqual({
      method: RequestMethod.GET,
      path: 'projects',
      resource: ExternalApiResource.Projects,
    });
    expect(handlerContract('findTasks')).toEqual({
      method: RequestMethod.GET,
      path: 'tasks',
      resource: ExternalApiResource.Tasks,
    });
    expect(handlerContract('findRisks')).toEqual({
      method: RequestMethod.GET,
      path: 'risks',
      resource: ExternalApiResource.Risks,
    });
    expect(handlerContract('findIssues')).toEqual({
      method: RequestMethod.GET,
      path: 'issues',
      resource: ExternalApiResource.Issues,
    });
  });
});

function handlerContract(
  name: 'findIssues' | 'findProjects' | 'findRisks' | 'findTasks',
) {
  const handler = ExternalV1Controller.prototype[name];
  return {
    method: Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod,
    path: Reflect.getMetadata(PATH_METADATA, handler) as string,
    resource: Reflect.getMetadata(
      EXTERNAL_API_RESOURCE_KEY,
      handler,
    ) as ExternalApiResource,
  };
}
