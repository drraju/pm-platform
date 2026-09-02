import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ExternalCursorCodec } from '../contracts/external-cursor';
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

const cursorValue = {
  id: '11111111-1111-4111-8111-111111111111',
  updatedAt: '2026-08-02T10:00:00.000Z',
};

describe('external cursor and pagination contract', () => {
  let codec: ExternalCursorCodec;
  let policy: ExternalPaginationPolicy;

  beforeEach(() => {
    codec = new ExternalCursorCodec('test-cursor-secret');
    policy = new ExternalPaginationPolicy(codec);
  });

  it('uses the default limit of 200 and does not fabricate snapshotAt', async () => {
    const request = plainToInstance(ExternalPageRequestDto, {});

    await expect(validate(request)).resolves.toEqual([]);
    expect(policy.validate(request)).toEqual({
      cursor: null,
      limit: EXTERNAL_DEFAULT_PAGE_LIMIT,
      snapshotAt: null,
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
    expect(() => policy.validate(excessive)).toThrow(BadRequestException);
  });

  it('rejects invalid timestamp filters', async () => {
    const request = plainToInstance(ExternalPageRequestDto, {
      snapshotAt: 'not-a-timestamp',
      updatedSince: 'also-invalid',
    });

    await expect(validate(request)).resolves.not.toEqual([]);
    expect(() => policy.validate(request)).toThrow(BadRequestException);
  });

  it('round-trips an opaque signed cursor representing updatedAt and id', () => {
    const encoded = codec.encode(cursorValue);

    expect(encoded).not.toContain(cursorValue.id);
    expect(codec.decode(encoded)).toEqual(cursorValue);
  });

  it.each(['not-a-cursor', '', 'eyJpZCI6ImJhZCJ9.invalid'])(
    'rejects malformed cursor %s',
    (cursor) => {
      expect(() => codec.decode(cursor)).toThrow(BadRequestException);
    },
  );

  it('rejects a tampered cursor signature', () => {
    const encoded = codec.encode(cursorValue);
    const [payload, signature] = encoded.split('.');
    const tamperedSignature = `${signature[0] === 'a' ? 'b' : 'a'}${signature.slice(1)}`;

    expect(() => codec.decode(`${payload}.${tamperedSignature}`)).toThrow(
      BadRequestException,
    );
  });

  it('requires the stable snapshot boundary on subsequent cursor pages', () => {
    expect(() =>
      policy.validate({
        cursor: codec.encode(cursorValue),
        limit: 200,
      }),
    ).toThrow('snapshotAt is required');
  });

  it('rejects filters or cursors outside the snapshot boundary', () => {
    expect(() =>
      policy.validate({
        limit: 200,
        snapshotAt: '2026-08-01T10:00:00.000Z',
        updatedSince: '2026-08-02T10:00:00.000Z',
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      policy.validate({
        cursor: codec.encode(cursorValue),
        limit: 200,
        snapshotAt: '2026-08-01T10:00:00.000Z',
      }),
    ).toThrow(BadRequestException);
  });

  it('compares extraction boundaries chronologically across time-zone offsets', () => {
    expect(() =>
      policy.validate({
        limit: 200,
        snapshotAt: '2026-08-02T09:00:00.000Z',
        updatedSince: '2026-08-02T10:00:00.000+02:00',
      }),
    ).not.toThrow();
    expect(() =>
      policy.validate({
        limit: 200,
        snapshotAt: '2026-08-02T11:00:00.000Z',
        updatedSince: '2026-08-02T10:00:00.000-02:00',
      }),
    ).toThrow(BadRequestException);
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
