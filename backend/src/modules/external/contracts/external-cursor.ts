import { BadRequestException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { isISO8601, isUUID } from 'class-validator';
import { ExternalApiResource } from '../auth/external-api-resource';

const EXTERNAL_CURSOR_VERSION = 2;
const INVALID_CURSOR_MESSAGE = 'Invalid external cursor';

export type ExternalCursor = Readonly<{
  id: string;
  updatedAt: string;
}>;

export type ExternalCursorContext = Readonly<{
  filters: Readonly<{
    updatedSince: string | null;
  }>;
  resource: ExternalApiResource;
  snapshotAt: string;
}>;

type ExternalCursorPayload = Readonly<{
  filters: ExternalCursorContext['filters'];
  position: ExternalCursor;
  resource: ExternalApiResource;
  snapshotAt: string;
  version: typeof EXTERNAL_CURSOR_VERSION;
}>;

export function normalizeExternalCursorContext(
  resource: ExternalApiResource,
  snapshotAt: string,
  updatedSince: string | null,
): ExternalCursorContext {
  if (!Object.values(ExternalApiResource).includes(resource)) {
    throw invalidExternalCursor();
  }

  return Object.freeze({
    filters: Object.freeze({
      updatedSince:
        updatedSince === null
          ? null
          : normalizeExternalCursorTimestamp(updatedSince),
    }),
    resource,
    snapshotAt: normalizeExternalCursorTimestamp(snapshotAt),
  });
}

export function invalidExternalCursor(): BadRequestException {
  return new BadRequestException(INVALID_CURSOR_MESSAGE);
}

export class ExternalCursorCodec {
  constructor(private readonly signingSecret: string) {
    if (!signingSecret) {
      throw new Error('External cursor signing secret is required');
    }
  }

  encode(context: ExternalCursorContext, position: ExternalCursor): string {
    const normalizedContext = normalizeExternalCursorContext(
      context.resource,
      context.snapshotAt,
      context.filters.updatedSince,
    );
    const normalizedPosition = normalizeExternalCursorPosition(position);
    this.assertPositionWithinContext(normalizedPosition, normalizedContext);

    const payload = Buffer.from(
      JSON.stringify({
        version: EXTERNAL_CURSOR_VERSION,
        resource: normalizedContext.resource,
        snapshotAt: normalizedContext.snapshotAt,
        filters: {
          updatedSince: normalizedContext.filters.updatedSince,
        },
        position: {
          updatedAt: normalizedPosition.updatedAt,
          id: normalizedPosition.id,
        },
      } satisfies ExternalCursorPayload),
    ).toString('base64url');
    return `${payload}.${this.sign(payload)}`;
  }

  decode(
    cursor: string,
    expectedContext: ExternalCursorContext,
  ): ExternalCursor {
    try {
      const [payload, signature, extra] = cursor.split('.');
      if (!payload || !signature || extra) {
        throw new Error('Malformed cursor');
      }

      const expectedSignature = Buffer.from(this.sign(payload), 'base64url');
      const suppliedSignature = Buffer.from(signature, 'base64url');
      if (
        expectedSignature.length !== suppliedSignature.length ||
        !timingSafeEqual(expectedSignature, suppliedSignature)
      ) {
        throw new Error('Invalid cursor signature');
      }

      const parsed = JSON.parse(
        Buffer.from(payload, 'base64url').toString('utf8'),
      ) as unknown;
      const decoded = this.validatePayload(parsed);
      const normalizedExpectedContext = normalizeExternalCursorContext(
        expectedContext.resource,
        expectedContext.snapshotAt,
        expectedContext.filters.updatedSince,
      );
      if (!contextsMatch(decoded.context, normalizedExpectedContext)) {
        throw new Error('Cursor context mismatch');
      }

      this.assertPositionWithinContext(decoded.position, decoded.context);
      return decoded.position;
    } catch {
      throw invalidExternalCursor();
    }
  }

  private validatePayload(payload: unknown): Readonly<{
    context: ExternalCursorContext;
    position: ExternalCursor;
  }> {
    if (
      !hasExactKeys(payload, [
        'filters',
        'position',
        'resource',
        'snapshotAt',
        'version',
      ]) ||
      payload.version !== EXTERNAL_CURSOR_VERSION ||
      !hasExactKeys(payload.filters, ['updatedSince']) ||
      !hasExactKeys(payload.position, ['id', 'updatedAt']) ||
      typeof payload.resource !== 'string' ||
      typeof payload.snapshotAt !== 'string' ||
      (payload.filters.updatedSince !== null &&
        typeof payload.filters.updatedSince !== 'string') ||
      typeof payload.position.id !== 'string' ||
      typeof payload.position.updatedAt !== 'string'
    ) {
      throw new Error('Unsupported cursor payload');
    }

    const context = normalizeExternalCursorContext(
      payload.resource as ExternalApiResource,
      payload.snapshotAt,
      payload.filters.updatedSince,
    );
    const position = normalizeExternalCursorPosition(payload.position);
    if (
      context.snapshotAt !== payload.snapshotAt ||
      context.filters.updatedSince !== payload.filters.updatedSince ||
      position.updatedAt !== payload.position.updatedAt ||
      position.id !== payload.position.id
    ) {
      throw new Error('Noncanonical cursor payload');
    }

    return Object.freeze({ context, position });
  }

  private assertPositionWithinContext(
    position: ExternalCursor,
    context: ExternalCursorContext,
  ): void {
    const positionTime = Date.parse(position.updatedAt);
    if (
      positionTime > Date.parse(context.snapshotAt) ||
      (context.filters.updatedSince !== null &&
        positionTime < Date.parse(context.filters.updatedSince))
    ) {
      throw invalidExternalCursor();
    }
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.signingSecret)
      .update(`pm-platform:external:v1:cursor:${payload}`)
      .digest('base64url');
  }
}

function normalizeExternalCursorPosition(
  position: Partial<ExternalCursor>,
): ExternalCursor {
  if (
    typeof position.id !== 'string' ||
    !isUUID(position.id) ||
    typeof position.updatedAt !== 'string'
  ) {
    throw invalidExternalCursor();
  }

  return Object.freeze({
    id: position.id.toLowerCase(),
    updatedAt: normalizeExternalCursorTimestamp(position.updatedAt),
  });
}

function normalizeExternalCursorTimestamp(timestamp: string): string {
  if (
    timestamp !== timestamp.trim() ||
    !isISO8601(timestamp, { strict: true, strictSeparator: true })
  ) {
    throw invalidExternalCursor();
  }
  const instant = Date.parse(timestamp);
  if (!Number.isFinite(instant)) {
    throw invalidExternalCursor();
  }
  return new Date(instant).toISOString();
}

function contextsMatch(
  actual: ExternalCursorContext,
  expected: ExternalCursorContext,
): boolean {
  return (
    actual.resource === expected.resource &&
    actual.snapshotAt === expected.snapshotAt &&
    actual.filters.updatedSince === expected.filters.updatedSince
  );
}

function hasExactKeys(
  value: unknown,
  expectedKeys: readonly string[],
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join(',') === [...expectedKeys].sort().join(',')
  );
}
