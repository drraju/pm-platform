/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthorizationPolicyService } from '../../../common/authz/authorization-policy.service';
import { PermissionKey } from '../../../common/authz/permissions';
import { PermissionsGuard } from '../../../common/authz/permissions.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ResourceCalendarAssignmentApiService } from '../resource-calendar-assignment-api.service';
import { ResourceCalendarAssignmentController } from '../resource-calendar-assignment.controller';

const resourceId = '11111111-1111-4111-8111-111111111111';
const calendarId = '22222222-2222-4222-8222-222222222222';

describe('ResourceCalendarAssignmentController authorization', () => {
  let app: INestApplication;
  let grantedPermissions: PermissionKey[];

  beforeEach(async () => {
    grantedPermissions = [];
    const response = {
      assignedCalendarId: calendarId,
      assignmentState: 'assigned',
      calendarName: 'Enterprise Calendar',
      calendarStatus: 'active',
      effectiveCalendarId: calendarId,
      resourceId,
      updatedAt: new Date('2026-07-14T00:00:00.000Z'),
      updatedBy: null,
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [ResourceCalendarAssignmentController],
      providers: [
        {
          provide: ResourceCalendarAssignmentApiService,
          useValue: {
            assignCalendar: jest.fn().mockResolvedValue(response),
            clearCalendarAssignment: jest.fn(),
            getCalendarAssignment: jest.fn().mockResolvedValue(response),
          },
        },
        Reflector,
        PermissionsGuard,
        {
          provide: AuthorizationPolicyService,
          useValue: {
            getGrantedPermissionKeys: jest.fn(() =>
              Promise.resolve(new Set(grantedPermissions)),
            ),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const httpRequest = context.switchToHttp().getRequest<{
            headers: { authorization?: string };
            user?: { email: string; roleId: string; userId: string };
          }>();
          if (!httpRequest.headers.authorization) {
            throw new UnauthorizedException();
          }
          httpRequest.user = {
            email: 'manager@example.com',
            roleId: 'manager-role-id',
            userId: '33333333-3333-4333-8333-333333333333',
          };
          return true;
        },
      })
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

  it('returns 401 when authentication is absent', async () => {
    await request(app.getHttpServer())
      .get(`/resources/${resourceId}/calendar`)
      .expect(401);
  });

  it('returns 401 for unauthenticated mutation requests', async () => {
    await request(app.getHttpServer())
      .put(`/resources/${resourceId}/calendar`)
      .send({ calendarId })
      .expect(401);
    await request(app.getHttpServer())
      .delete(`/resources/${resourceId}/calendar`)
      .expect(401);
  });

  it('requires resource.read for GET', async () => {
    grantedPermissions = [PermissionKey.ResourceRead];
    await request(app.getHttpServer())
      .get(`/resources/${resourceId}/calendar`)
      .set('Authorization', 'Bearer test')
      .expect(200);

    grantedPermissions = [PermissionKey.ResourceUpdate];
    await request(app.getHttpServer())
      .get(`/resources/${resourceId}/calendar`)
      .set('Authorization', 'Bearer test')
      .expect(403);
  });

  it('requires resource.update for PUT and DELETE', async () => {
    grantedPermissions = [PermissionKey.ResourceRead];
    await request(app.getHttpServer())
      .put(`/resources/${resourceId}/calendar`)
      .set('Authorization', 'Bearer test')
      .send({ calendarId })
      .expect(403);
    await request(app.getHttpServer())
      .delete(`/resources/${resourceId}/calendar`)
      .set('Authorization', 'Bearer test')
      .expect(403);

    grantedPermissions = [];
    await request(app.getHttpServer())
      .delete(`/resources/${resourceId}/calendar`)
      .set('Authorization', 'Bearer test')
      .expect(403);

    grantedPermissions = [PermissionKey.ResourceUpdate];
    await request(app.getHttpServer())
      .put(`/resources/${resourceId}/calendar`)
      .set('Authorization', 'Bearer test')
      .send({ calendarId })
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/resources/${resourceId}/calendar`)
      .set('Authorization', 'Bearer test')
      .expect(204);
  });
});
