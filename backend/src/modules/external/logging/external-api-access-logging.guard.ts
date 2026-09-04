import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { UserIdentityType } from '../../../common/enums/user-identity-type.enum';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { ExternalApiResource } from '../auth/external-api-resource';
import { EXTERNAL_API_RESOURCE_KEY } from '../auth/external-api-resource.decorator';

type ExternalApiAccessResult =
  | 'ALLOWED'
  | 'DENIED'
  | 'ERROR'
  | 'INVALID_REQUEST'
  | 'UNAUTHENTICATED';

type ExternalApiAccessEvent = Readonly<{
  durationMs: number;
  event: 'external_api_access';
  identityType: UserIdentityType | null;
  operation: 'READ';
  requestId: string;
  resource: ExternalApiResource;
  result: ExternalApiAccessResult;
  serviceUserId: string | null;
  status: number;
  timestamp: string;
}>;

type ExternalApiAccessRequest = Request & {
  user?: AuthenticatedUser;
};

@Injectable()
export class ExternalApiAccessLoggingGuard implements CanActivate {
  private readonly logger = new Logger(ExternalApiAccessLoggingGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): true {
    const resource = this.reflector.getAllAndOverride<ExternalApiResource>(
      EXTERNAL_API_RESOURCE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!resource) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<ExternalApiAccessRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const requestId = randomUUID();
    const startedAt = Date.now();

    response.once('finish', () => {
      this.emitAccessEvent(
        request,
        resource,
        response.statusCode,
        requestId,
        startedAt,
      );
    });

    return true;
  }

  private emitAccessEvent(
    request: ExternalApiAccessRequest,
    resource: ExternalApiResource,
    status: number,
    requestId: string,
    startedAt: number,
  ): void {
    const identityType = request.user?.identityType ?? null;
    const elapsedMs = Date.now() - startedAt;
    const event: ExternalApiAccessEvent = Object.freeze({
      event: 'external_api_access',
      timestamp: new Date().toISOString(),
      requestId,
      serviceUserId:
        identityType === UserIdentityType.Service
          ? (request.user?.userId ?? null)
          : null,
      identityType,
      resource,
      operation: 'READ',
      result: resultForStatus(status),
      status,
      durationMs: Number.isFinite(elapsedMs)
        ? Math.max(0, Math.round(elapsedMs))
        : 0,
    });

    switch (event.result) {
      case 'ALLOWED':
        this.logger.log(event);
        break;
      case 'ERROR':
        this.logger.error(event);
        break;
      default:
        this.logger.warn(event);
    }
  }
}

function resultForStatus(status: number): ExternalApiAccessResult {
  if (status >= 200 && status < 300) {
    return 'ALLOWED';
  }
  if (status === 401) {
    return 'UNAUTHENTICATED';
  }
  if (status === 403) {
    return 'DENIED';
  }
  if (status >= 400 && status < 500) {
    return 'INVALID_REQUEST';
  }
  return 'ERROR';
}
