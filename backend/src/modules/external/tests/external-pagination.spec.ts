import { BadRequestException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ExternalApiResource } from '../auth/external-api-resource';
import {
  ExternalCursorCodec,
  ExternalCursorContext,
  normalizeExternalCursorContext,
} from '../contracts/external-cursor';
import {
  EXTERNAL_DEFAULT_PAGE_LIMIT,
  EXTERNAL_MAX_PAGE_LIMIT,
  EXTERNAL_PAGE_ORDER,
  EXTERNAL_SNAPSHOT_BOUNDARY_IS_INCLUSIVE,
  EXTERNAL_UPDATED_SINCE_IS_INCLUSIVE,
  ExternalPageRequestDto,
  ExternalPageDto,
  ExternalPaginationPolicy,
} from '../contracts/external-page.dto';

const signingSecret = 'test-cursor-secret';
const signingPrefix = 'pm-platform:external:v1:cursor:';
const snapshotAt = '2026-08-10T12:00:00.000Z';
const updatedSince = '2026-08-01T00:00:00.000Z';
const cursorPosition = {
  id: '11111111-1111-4111-8111-111111111111',
  updatedAt: '2026-08-02T10:00:00.000Z',
};
const resources = Object.values(ExternalApiResource);
const crossResourceCases = resources.flatMap((source) =>
  resources
    .filter((target) => target !== source)
    .map((target) => [source, target] as const),
);

describe('external cursor and pagination contract', () => {
  let codec: ExternalCursorCodec;
  let policy: ExternalPaginationPolicy;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(snapshotAt));
    codec = new ExternalCursorCodec(signingSecret);
    policy = new ExternalPaginationPolicy(codec);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('establishes a canonical snapshot and the default limit on a first page', async () => {
    const request = plainToInstance(ExternalPageRequestDto, {});

    await expect(validate(request)).resolves.toEqual([]);
    expect(policy.validate(ExternalApiResource.Projects, request)).toEqual({
      cursor: null,
      cursorContext: context(ExternalApiResource.Projects),
      limit: EXTERNAL_DEFAULT_PAGE_LIMIT,
      snapshotAt,
      updatedSince: null,
    });
  });

  it('accepts the maximum limit and rejects values above 1000', async () => {
    const maximum = plainToInstance(ExternalPageRequestDto, {
      limit: EXTERNAL_MAX_PAGE_LIMIT,
    });
    const excessive = plainToInstance(ExternalPageRequestDto, { limit: 1001 });

    await expect(validate(maximum)).resolves.toEqual([]);
    await expect(validate(excessive)).resolves.not.toEqual([]);
    expect(() =>
      policy.validate(ExternalApiResource.Projects, excessive),
    ).toThrow(BadRequestException);
  });

  it.each([
    ['not-a-timestamp', undefined],
    [` ${snapshotAt}`, undefined],
    [snapshotAt, 'null'],
    [snapshotAt, 'undefined'],
    [snapshotAt, ''],
  ])(
    'rejects invalid or whitespace-padded timestamp filters',
    (requestSnapshotAt, requestUpdatedSince) => {
      expect(() =>
        policy.validate(ExternalApiResource.Projects, {
          snapshotAt: requestSnapshotAt,
          updatedSince: requestUpdatedSince,
        }),
      ).toThrow(BadRequestException);
    },
  );

  it('encodes the exact version-2 payload and canonicalizes position values', () => {
    const encoded = codec.encode(context(ExternalApiResource.Projects), {
      id: cursorPosition.id.toUpperCase(),
      updatedAt: '2026-08-02T11:00:00.000+01:00',
    });
    const [payload] = encoded.split('.');

    expect(
      JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')),
    ).toEqual({
      version: 2,
      resource: ExternalApiResource.Projects,
      snapshotAt,
      filters: { updatedSince: null },
      position: cursorPosition,
    });
    expect(encoded).not.toContain(cursorPosition.id);
    expect(
      codec.decode(encoded, context(ExternalApiResource.Projects)),
    ).toEqual(cursorPosition);
  });

  it.each(resources)(
    'accepts a %s cursor in the same extraction context',
    (resource) => {
      const cursor = codec.encode(context(resource), cursorPosition);

      expect(
        policy.validate(resource, { cursor, limit: 200, snapshotAt }),
      ).toEqual(
        expect.objectContaining({
          cursor: cursorPosition,
          cursorContext: context(resource),
          snapshotAt,
          updatedSince: null,
        }),
      );
    },
  );

  it.each(crossResourceCases)(
    'rejects a %s cursor used for %s with the generic cursor error',
    (source, target) => {
      const cursor = codec.encode(context(source), cursorPosition);

      expectInvalidCursor(() =>
        policy.validate(target, { cursor, snapshotAt }),
      );
    },
  );

  it('accepts identical and equivalent snapshot representations', () => {
    const cursor = codec.encode(
      context(ExternalApiResource.Projects),
      cursorPosition,
    );

    expect(() =>
      policy.validate(ExternalApiResource.Projects, { cursor, snapshotAt }),
    ).not.toThrow();
    expect(
      policy.validate(ExternalApiResource.Projects, {
        cursor,
        snapshotAt: '2026-08-10T13:00:00.000+01:00',
      }).snapshotAt,
    ).toBe(snapshotAt);
  });

  it('rejects changed or missing snapshot context', () => {
    const cursor = codec.encode(
      context(ExternalApiResource.Projects),
      cursorPosition,
    );

    expectInvalidCursor(() =>
      policy.validate(ExternalApiResource.Projects, {
        cursor,
        snapshotAt: '2026-08-10T12:00:00.001Z',
      }),
    );
    expectInvalidCursor(() =>
      policy.validate(ExternalApiResource.Projects, { cursor }),
    );
  });

  it('accepts identical and equivalent updatedSince representations', () => {
    const filteredContext = context(
      ExternalApiResource.Projects,
      snapshotAt,
      updatedSince,
    );
    const cursor = codec.encode(filteredContext, cursorPosition);

    expect(() =>
      policy.validate(ExternalApiResource.Projects, {
        cursor,
        snapshotAt,
        updatedSince,
      }),
    ).not.toThrow();
    expect(
      policy.validate(ExternalApiResource.Projects, {
        cursor,
        snapshotAt,
        updatedSince: '2026-08-01T01:00:00.000+01:00',
      }).updatedSince,
    ).toBe(updatedSince);
  });

  it('rejects changed, removed, or added updatedSince context', () => {
    const filteredCursor = codec.encode(
      context(ExternalApiResource.Projects, snapshotAt, updatedSince),
      cursorPosition,
    );
    const unfilteredCursor = codec.encode(
      context(ExternalApiResource.Projects),
      cursorPosition,
    );

    expectInvalidCursor(() =>
      policy.validate(ExternalApiResource.Projects, {
        cursor: filteredCursor,
        snapshotAt,
        updatedSince: '2026-08-01T00:00:00.001Z',
      }),
    );
    expectInvalidCursor(() =>
      policy.validate(ExternalApiResource.Projects, {
        cursor: filteredCursor,
        snapshotAt,
      }),
    );
    expectInvalidCursor(() =>
      policy.validate(ExternalApiResource.Projects, {
        cursor: unfilteredCursor,
        snapshotAt,
        updatedSince,
      }),
    );
    expect(() =>
      policy.validate(ExternalApiResource.Projects, {
        cursor: unfilteredCursor,
        snapshotAt,
      }),
    ).not.toThrow();
  });

  it('allows page-size changes within the same extraction context', () => {
    const cursor = codec.encode(
      context(ExternalApiResource.Tasks),
      cursorPosition,
    );

    expect(
      policy.validate(ExternalApiResource.Tasks, {
        cursor,
        limit: EXTERNAL_MAX_PAGE_LIMIT,
        snapshotAt,
      }).limit,
    ).toBe(EXTERNAL_MAX_PAGE_LIMIT);
  });

  it('rejects filters outside the snapshot boundary', () => {
    expect(() =>
      policy.validate(ExternalApiResource.Projects, {
        limit: 200,
        snapshotAt: '2026-08-01T10:00:00.000Z',
        updatedSince: '2026-08-02T10:00:00.000Z',
      }),
    ).toThrow(BadRequestException);
  });

  it('compares extraction boundaries chronologically across time-zone offsets', () => {
    expect(() =>
      policy.validate(ExternalApiResource.Projects, {
        limit: 200,
        snapshotAt: '2026-08-02T09:00:00.000Z',
        updatedSince: '2026-08-02T10:00:00.000+02:00',
      }),
    ).not.toThrow();
    expect(() =>
      policy.validate(ExternalApiResource.Projects, {
        limit: 200,
        snapshotAt: '2026-08-02T11:00:00.000Z',
        updatedSince: '2026-08-02T10:00:00.000-02:00',
      }),
    ).toThrow(BadRequestException);
  });

  it.each(['not-a-cursor', '', 'eyJpZCI6ImJhZCJ9.invalid'])(
    'rejects malformed cursor %s',
    (cursor) => {
      expectInvalidCursor(() =>
        codec.decode(cursor, context(ExternalApiResource.Projects)),
      );
    },
  );

  it('treats an explicitly empty request cursor as malformed', () => {
    expectInvalidCursor(() =>
      policy.validate(ExternalApiResource.Projects, {
        cursor: '',
        snapshotAt,
      }),
    );
  });

  it('rejects tampered payloads and signatures', () => {
    const encoded = codec.encode(
      context(ExternalApiResource.Projects),
      cursorPosition,
    );
    const [payload, signature] = encoded.split('.');
    const parsed = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as Record<string, unknown>;
    const tamperedPayload = Buffer.from(
      JSON.stringify({ ...parsed, resource: ExternalApiResource.Tasks }),
    ).toString('base64url');
    const tamperedSignature = `${signature[0] === 'a' ? 'b' : 'a'}${signature.slice(1)}`;

    expectInvalidCursor(() =>
      codec.decode(
        `${tamperedPayload}.${signature}`,
        context(ExternalApiResource.Projects),
      ),
    );
    expectInvalidCursor(() =>
      codec.decode(
        `${payload}.${tamperedSignature}`,
        context(ExternalApiResource.Projects),
      ),
    );
  });

  it.each([
    ['version 1', versionOnePayload()],
    ['future version', versionTwoPayload({ version: 3 })],
    ['missing nested key', versionTwoPayload({ filters: {} })],
    [
      'extra nested key',
      versionTwoPayload({ filters: { updatedSince: null, extra: true } }),
    ],
    ['invalid resource', versionTwoPayload({ resource: 'forecasts' })],
    [
      'invalid UUID',
      versionTwoPayload({
        position: { ...cursorPosition, id: 'not-a-uuid' },
      }),
    ],
    [
      'noncanonical snapshot',
      versionTwoPayload({ snapshotAt: '2026-08-10T13:00:00.000+01:00' }),
    ],
    [
      'noncanonical filter',
      versionTwoPayload({
        filters: { updatedSince: '2026-08-01T01:00:00.000+01:00' },
      }),
    ],
    [
      'noncanonical position',
      versionTwoPayload({
        position: {
          ...cursorPosition,
          updatedAt: '2026-08-02T11:00:00.000+01:00',
        },
      }),
    ],
    [
      'position after snapshot',
      versionTwoPayload({
        position: { ...cursorPosition, updatedAt: '2026-08-10T12:00:00.001Z' },
      }),
    ],
  ])('rejects a validly signed %s payload', (_name, payload) => {
    expectInvalidCursor(() =>
      codec.decode(
        signJsonPayload(payload),
        context(ExternalApiResource.Projects),
      ),
    );
  });

  it('rejects a position before the signed filter lower bound', () => {
    const updatedSince = '2026-08-03T00:00:00.000Z';
    const payload = versionTwoPayload({
      filters: { updatedSince },
    });

    expectInvalidCursor(() =>
      codec.decode(
        signJsonPayload(payload),
        context(ExternalApiResource.Projects, snapshotAt, updatedSince),
      ),
    );
  });

  it('rejects validly signed malformed JSON and extra cursor segments', () => {
    expectInvalidCursor(() =>
      codec.decode(signRawPayload('{'), context(ExternalApiResource.Projects)),
    );
    const cursor = codec.encode(
      context(ExternalApiResource.Projects),
      cursorPosition,
    );
    expectInvalidCursor(() =>
      codec.decode(`${cursor}.extra`, context(ExternalApiResource.Projects)),
    );
  });

  it('defines deterministic keyset ordering and inclusive extraction bounds', () => {
    expect(EXTERNAL_PAGE_ORDER).toEqual([
      { direction: 'ASC', field: 'updatedAt' },
      { direction: 'ASC', field: 'id' },
    ]);
    expect(EXTERNAL_UPDATED_SINCE_IS_INCLUSIVE).toBe(true);
    expect(EXTERNAL_SNAPSHOT_BOUNDARY_IS_INCLUSIVE).toBe(true);
  });

  it('defines a page response without count or total fields', () => {
    const response = {
      data: [{ id: 'project-1' }],
      nextCursor: null,
      snapshotAt: '2026-08-02T10:00:00.000Z',
    } satisfies ExternalPageDto<{ id: string }>;

    expect(Object.keys(response).sort()).toEqual(
      ['data', 'nextCursor', 'snapshotAt'].sort(),
    );
  });
});

function context(
  resource: ExternalApiResource,
  contextSnapshotAt = snapshotAt,
  contextUpdatedSince: string | null = null,
): ExternalCursorContext {
  return normalizeExternalCursorContext(
    resource,
    contextSnapshotAt,
    contextUpdatedSince,
  );
}

function versionTwoPayload(overrides: Record<string, unknown> = {}) {
  return {
    version: 2,
    resource: ExternalApiResource.Projects,
    snapshotAt,
    filters: { updatedSince: null },
    position: cursorPosition,
    ...overrides,
  };
}

function versionOnePayload() {
  return {
    id: cursorPosition.id,
    updatedAt: cursorPosition.updatedAt,
    version: 1,
  };
}

function signJsonPayload(payload: unknown): string {
  return signRawPayload(JSON.stringify(payload));
}

function signRawPayload(payloadJson: string): string {
  const payload = Buffer.from(payloadJson).toString('base64url');
  const signature = createHmac('sha256', signingSecret)
    .update(`${signingPrefix}${payload}`)
    .digest('base64url');
  return `${payload}.${signature}`;
}

function expectInvalidCursor(action: () => unknown): void {
  try {
    action();
    throw new Error('Expected cursor validation to fail');
  } catch (error) {
    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toEqual({
      error: 'Bad Request',
      message: 'Invalid external cursor',
      statusCode: 400,
    });
  }
}
