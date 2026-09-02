import { ExternalApiResource } from '../auth/external-api-resource';
import { EXTERNAL_API_RESOURCE_KEY } from '../auth/external-api-resource.decorator';
import { ExternalV1Controller } from '../external-v1.controller';
import { ExternalReadQueryService } from '../external-read-query.service';
import {
  ExternalDataScope,
  ResolvedExternalDataScope,
} from '../scope/external-data-scope';

describe('ExternalV1Controller', () => {
  const scope: ResolvedExternalDataScope = {
    kind: ExternalDataScope.AllProjects,
  };
  let queryService: Record<string, jest.Mock>;
  let controller: ExternalV1Controller;

  beforeEach(() => {
    queryService = {
      findIssues: jest.fn(),
      findProjects: jest.fn(),
      findRisks: jest.fn(),
      findTasks: jest.fn(),
    };
    controller = new ExternalV1Controller(
      queryService as unknown as ExternalReadQueryService,
    );
  });

  it.each([
    ['findProjects', ExternalApiResource.Projects],
    ['findTasks', ExternalApiResource.Tasks],
    ['findRisks', ExternalApiResource.Risks],
    ['findIssues', ExternalApiResource.Issues],
  ] as const)(
    '%s delegates only to its external query and declares the domain boundary',
    async (method, resource) => {
      const request = { limit: 50 };
      const response = {
        data: [],
        nextCursor: null,
        snapshotAt: '2026-08-10T12:00:00.000Z',
      };
      queryService[method].mockResolvedValue(response);

      await expect(controller[method](scope, request)).resolves.toBe(response);
      expect(queryService[method]).toHaveBeenCalledWith(scope, request);
      expect(
        Reflect.getMetadata(
          EXTERNAL_API_RESOURCE_KEY,
          ExternalV1Controller.prototype[method],
        ),
      ).toBe(resource);
    },
  );
});
