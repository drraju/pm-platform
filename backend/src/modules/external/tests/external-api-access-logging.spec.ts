/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  BadRequestException,
  ExecutionContext,
  INestApplication,
  Logger,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { isISO8601, isUUID } from 'class-validator';
import request from 'supertest';
import { AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { PermissionKey } from '../../../common/authz/permissions';
import { UserIdentityType } from '../../../common/enums/user-identity-type.enum';
import { UserRole } from '../../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { ExternalApiGuard } from '../auth/external-api.guard';
import { ExternalApiPolicyService } from '../auth/external-api-policy.service';
import { ExternalApiResource } from '../auth/external-api-resource';
import { ExternalV1Controller } from '../external-v1.controller';
import { ExternalReadQueryService } from '../external-read-query.service';
import { ExternalApiAccessLoggingGuard } from '../logging/external-api-access-logging.guard';
import {
  ExternalDataScope,
  ExternalDataScopeService,
} from '../scope/external-data-scope';

const accessEventKeys = [
  'durationMs',
  'event',
  'identityType',
  'operation',
  'requestId',
  'resource',
  'result',
  'serviceUserId',
  'status',
  'timestamp',
].sort();
const serviceUserId = '11111111-1111-4111-8111-111111111111';
const snapshotAt = '2026-09-04T12:00:00.000Z';
const successfulPage = Object.freeze({
  data: [],
  nextCursor: null,
  snapshotAt,
});

type AccessEvent = Record<string, unknown> & {
  durationMs: number;
  event: 'external_api_access';
  identityType: UserIdentityType | null;
  operation: 'READ';
  requestId: string;
  resource: ExternalApiResource;
  result: string;
  serviceUserId: string | null;
  status: number;
  timestamp: string;
};

type TestRequest = {
  externalDataScope?: { kind: ExternalDataScope };
  headers: Record<string, string | undefined>;
  user?: AuthenticatedUser;
};

describe('external API access logging', () => {
  let app: INestApplication;
  let errorSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;
  let queryService: Record<
    'findIssues' | 'findProjects' | 'findRisks' | 'findTasks',
    jest.Mock
  >;
  let warnSpy: jest.SpyInstance;

  beforeEach(async () => {
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    queryService = {
      findIssues: jest.fn().mockResolvedValue(successfulPage),
      findProjects: jest.fn().mockResolvedValue(successfulPage),
      findRisks: jest.fn().mockResolvedValue(successfulPage),
      findTasks: jest.fn().mockResolvedValue(successfulPage),
    };
    const authorizationPolicy = {
      getActorRoleName: jest.fn((actor: AuthenticatedUser) =>
        Promise.resolve(
          actor.roleId === 'wrong-role'
            ? UserRole.PlatformAdmin
            : UserRole.ServiceUser,
        ),
      ),
      getGrantedPermissionKeys: jest.fn((actor: AuthenticatedUser) => {
        if (actor.roleId === 'missing-api-access') {
          return Promise.resolve(
            new Set([
              PermissionKey.ExternalProjectRead,
              PermissionKey.ExternalTaskRead,
              PermissionKey.ExternalRaidRead,
            ]),
          );
        }
        if (actor.roleId === 'missing-resource-permission') {
          return Promise.resolve(new Set([PermissionKey.ExternalApiAccess]));
        }
        return Promise.resolve(
          new Set([
            PermissionKey.ExternalApiAccess,
            PermissionKey.ExternalProjectRead,
            PermissionKey.ExternalTaskRead,
            PermissionKey.ExternalRaidRead,
          ]),
        );
      }),
    };
    const scopeService = {
      resolve: jest.fn((actor: AuthenticatedUser) =>
        Promise.resolve(
          actor.roleId === 'unresolved-scope'
            ? null
            : { kind: ExternalDataScope.AllProjects },
        ),
      ),
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [ExternalV1Controller],
      providers: [
        ExternalApiAccessLoggingGuard,
        ExternalApiGuard,
        ExternalApiPolicyService,
        {
          provide: AuthorizationPolicyService,
          useValue: authorizationPolicy,
        },
        { provide: ExternalDataScopeService, useValue: scopeService },
        { provide: ExternalReadQueryService, useValue: queryService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: authenticate })
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
    errorSpy.mockClear();
    logSpy.mockClear();
    warnSpy.mockClear();
  });

  afterEach(async () => {
    await app.close();
    errorSpy.mockRestore();
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it.each([
    ['/external/v1/projects', ExternalApiResource.Projects],
    ['/external/v1/tasks', ExternalApiResource.Tasks],
    ['/external/v1/risks', ExternalApiResource.Risks],
    ['/external/v1/issues', ExternalApiResource.Issues],
  ])('logs one allowed SERVICE read for GET %s', async (path, resource) => {
    await request(app.getHttpServer())
      .get(path)
      .set(validAuthorization())
      .expect(200);

    const event = expectSingleEvent();
    expect(event).toEqual(
      expect.objectContaining({
        event: 'external_api_access',
        identityType: UserIdentityType.Service,
        operation: 'READ',
        resource,
        result: 'ALLOWED',
        serviceUserId,
        status: 200,
      }),
    );
    expect(isUUID(event.requestId)).toBe(true);
    expect(isISO8601(event.timestamp, { strict: true })).toBe(true);
    expect(new Date(event.timestamp).toISOString()).toBe(event.timestamp);
    expect(Number.isFinite(event.durationMs)).toBe(true);
    expect(Number.isInteger(event.durationMs)).toBe(true);
    expect(event.durationMs).toBeGreaterThanOrEqual(0);
    expect(logSpy.mock.calls.some(([logged]) => logged === event)).toBe(true);
  });

  it.each([
    ['missing JWT', undefined],
    ['malformed JWT', 'Bearer malformed-jwt-canary'],
    ['expired JWT', 'Bearer expired-jwt-canary'],
  ])('logs one unauthenticated event for %s', async (_name, authorization) => {
    const pending = request(app.getHttpServer()).get('/external/v1/tasks');
    if (authorization) {
      pending.set('Authorization', authorization);
    }
    await pending.expect(401);

    const event = expectSingleEvent();
    expect(event).toEqual(
      expect.objectContaining({
        identityType: null,
        resource: ExternalApiResource.Tasks,
        result: 'UNAUTHENTICATED',
        serviceUserId: null,
        status: 401,
      }),
    );
    expect(Object.keys(event).sort()).toEqual(accessEventKeys);
    expect(warnSpy.mock.calls.some(([logged]) => logged === event)).toBe(true);
  });

  it.each([
    ['HUMAN identity', 'human', UserIdentityType.Human, null],
    ['wrong role', 'wrong-role', UserIdentityType.Service, serviceUserId],
    [
      'missing external.api.access',
      'missing-api-access',
      UserIdentityType.Service,
      serviceUserId,
    ],
    [
      'missing resource permission',
      'missing-resource-permission',
      UserIdentityType.Service,
      serviceUserId,
    ],
    [
      'unresolved scope',
      'unresolved-scope',
      UserIdentityType.Service,
      serviceUserId,
    ],
  ])(
    'logs one denied event for %s',
    async (_name, denial, identityType, expectedServiceUserId) => {
      await request(app.getHttpServer())
        .get('/external/v1/projects')
        .set(validAuthorization())
        .set('x-test-denial', denial)
        .expect(403);

      const event = expectSingleEvent();
      expect(event).toEqual(
        expect.objectContaining({
          identityType,
          resource: ExternalApiResource.Projects,
          result: 'DENIED',
          serviceUserId: expectedServiceUserId,
          status: 403,
        }),
      );
      expect(warnSpy.mock.calls.some(([logged]) => logged === event)).toBe(
        true,
      );
    },
  );

  it.each([
    ['invalid limit', { limit: 1001 }],
    ['invalid timestamp', { snapshotAt: 'invalid-timestamp-canary' }],
  ])('logs one invalid-request event for %s', async (_name, query) => {
    await request(app.getHttpServer())
      .get('/external/v1/risks')
      .set(validAuthorization())
      .query(query)
      .expect(400);

    const event = expectSingleEvent();
    expect(event).toEqual(
      expect.objectContaining({
        identityType: UserIdentityType.Service,
        resource: ExternalApiResource.Risks,
        result: 'INVALID_REQUEST',
        serviceUserId,
        status: 400,
      }),
    );
    expect(warnSpy.mock.calls.some(([logged]) => logged === event)).toBe(true);
    expect(JSON.stringify(accessEventCalls())).not.toContain(
      String(Object.values(query)[0]),
    );
  });

  it('logs an invalid cursor response without logging the cursor', async () => {
    const cursor = 'invalid-cursor-canary';
    queryService.findProjects.mockRejectedValueOnce(
      new BadRequestException('Invalid external cursor'),
    );

    await request(app.getHttpServer())
      .get('/external/v1/projects')
      .set(validAuthorization())
      .query({ cursor, snapshotAt })
      .expect(400);

    expect(expectSingleEvent()).toEqual(
      expect.objectContaining({
        result: 'INVALID_REQUEST',
        status: 400,
      }),
    );
    expect(JSON.stringify(accessEventCalls())).not.toContain(cursor);
  });

  it('logs a safe error event for an unexpected server exception', async () => {
    const exceptionMessage = 'server-exception-message-canary';
    queryService.findIssues.mockRejectedValueOnce(new Error(exceptionMessage));

    await request(app.getHttpServer())
      .get('/external/v1/issues')
      .set(validAuthorization())
      .expect(500);

    const event = expectSingleEvent();
    expect(event).toEqual(
      expect.objectContaining({
        resource: ExternalApiResource.Issues,
        result: 'ERROR',
        status: 500,
      }),
    );
    expect(Object.keys(event).sort()).toEqual(accessEventKeys);
    expect(errorSpy.mock.calls.some(([logged]) => logged === event)).toBe(true);
    expect(JSON.stringify(accessEventCalls())).not.toContain(exceptionMessage);
    expect(event).not.toHaveProperty('error');
    expect(event).not.toHaveProperty('message');
    expect(event).not.toHaveProperty('stack');
  });

  it('uses unique server-generated request IDs and ignores x-request-id', async () => {
    const suppliedRequestId = 'client-request-id-canary';
    const firstResponse = await request(app.getHttpServer())
      .get('/external/v1/projects')
      .set(validAuthorization())
      .set('x-request-id', suppliedRequestId)
      .expect(200);
    const secondResponse = await request(app.getHttpServer())
      .get('/external/v1/projects')
      .set(validAuthorization())
      .set('x-request-id', suppliedRequestId)
      .expect(200);

    const events = accessEvents();
    expect(events).toHaveLength(2);
    expect(events[0].requestId).not.toBe(events[1].requestId);
    expect(events.every(({ requestId }) => isUUID(requestId))).toBe(true);
    expect(
      events.every(({ requestId }) => requestId !== suppliedRequestId),
    ).toBe(true);
    expect(firstResponse.headers['x-request-id']).toBeUndefined();
    expect(secondResponse.headers['x-request-id']).toBeUndefined();
  });

  it('logs only the exact allowlist and excludes sensitive canary values', async () => {
    const canaries = {
      accessToken: 'access-token-canary',
      authorizationHeader: 'Bearer access-token-canary',
      clientSecret: 'client-secret-canary',
      cursor: 'cursor-canary',
      email: 'secret-email-canary@example.com',
      limit: '000000000000000000000007',
      password: 'password-canary',
      refreshToken: 'refresh-token-canary',
      responseBody: 'response-body-canary',
      roleId: 'role-id-canary',
      serviceCredential: 'service-credential-canary',
      signingSecret: 'signing-secret-canary',
      snapshotAt: '2026-09-04T12:00:00.000Z',
      updatedSince: '2026-09-01T12:00:00.000Z',
    };
    queryService.findProjects.mockResolvedValueOnce({
      ...successfulPage,
      data: [{ value: canaries.responseBody }],
    });

    await request(app.getHttpServer())
      .get('/external/v1/projects')
      .set('Authorization', canaries.authorizationHeader)
      .set('Cookie', `refreshToken=${canaries.refreshToken}`)
      .set('x-test-client-secret', canaries.clientSecret)
      .set('x-test-email', canaries.email)
      .set('x-test-role-id', canaries.roleId)
      .set('x-test-service-credential', canaries.serviceCredential)
      .set('x-test-signing-secret', canaries.signingSecret)
      .query({
        cursor: canaries.cursor,
        limit: canaries.limit,
        snapshotAt: canaries.snapshotAt,
        updatedSince: canaries.updatedSince,
      })
      .send({ password: canaries.password })
      .expect(200);

    const event = expectSingleEvent();
    expect(Object.keys(event).sort()).toEqual(accessEventKeys);
    const loggedArguments = JSON.stringify(accessEventCalls());
    for (const canary of Object.values(canaries)) {
      expect(loggedArguments).not.toContain(canary);
    }
  });

  function accessEventCalls(): unknown[][] {
    return [logSpy, warnSpy, errorSpy]
      .flatMap((spy) => spy.mock.calls)
      .filter(([value]) => isAccessEvent(value));
  }

  function accessEvents(): AccessEvent[] {
    return accessEventCalls().map(([event]) => event as AccessEvent);
  }

  function expectSingleEvent(): AccessEvent {
    const events = accessEvents();
    expect(events).toHaveLength(1);
    return events[0];
  }
});

function authenticate(context: ExecutionContext): true {
  const httpRequest = context.switchToHttp().getRequest<TestRequest>();
  const authorization = httpRequest.headers.authorization;
  if (
    !authorization ||
    authorization === 'Bearer malformed-jwt-canary' ||
    authorization === 'Bearer expired-jwt-canary'
  ) {
    throw new UnauthorizedException();
  }

  const denial = httpRequest.headers['x-test-denial'];
  httpRequest.user = {
    email:
      httpRequest.headers['x-test-email'] ?? 'external-service@example.com',
    identityType:
      denial === 'human' ? UserIdentityType.Human : UserIdentityType.Service,
    roleId: httpRequest.headers['x-test-role-id'] ?? denial ?? 'service-role',
    userId: serviceUserId,
  };
  return true;
}

function validAuthorization(): Record<string, string> {
  return { Authorization: 'Bearer valid-test-token' };
}

function isAccessEvent(value: unknown): value is AccessEvent {
  return (
    typeof value === 'object' &&
    value !== null &&
    'event' in value &&
    value.event === 'external_api_access'
  );
}
