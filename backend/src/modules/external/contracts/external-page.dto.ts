import { BadRequestException, Injectable } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  isISO8601,
} from 'class-validator';
import { ExternalApiResource } from '../auth/external-api-resource';
import {
  ExternalCursor,
  ExternalCursorCodec,
  ExternalCursorContext,
  invalidExternalCursor,
  normalizeExternalCursorContext,
} from './external-cursor';

export const EXTERNAL_DEFAULT_PAGE_LIMIT = 200;
export const EXTERNAL_MAX_PAGE_LIMIT = 1000;
export const EXTERNAL_PAGE_ORDER = Object.freeze([
  Object.freeze({ direction: 'ASC' as const, field: 'updatedAt' as const }),
  Object.freeze({ direction: 'ASC' as const, field: 'id' as const }),
]);
export const EXTERNAL_UPDATED_SINCE_IS_INCLUSIVE = true;
export const EXTERNAL_SNAPSHOT_BOUNDARY_IS_INCLUSIVE = true;

export class ExternalPageRequestDto {
  @ApiPropertyOptional({
    description:
      'Opaque signed keyset cursor. Continuation requests must reuse the same resource, snapshotAt, and updatedSince context.',
    type: String,
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    default: EXTERNAL_DEFAULT_PAGE_LIMIT,
    maximum: EXTERNAL_MAX_PAGE_LIMIT,
    minimum: 1,
    type: 'integer',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(EXTERNAL_MAX_PAGE_LIMIT)
  limit = EXTERNAL_DEFAULT_PAGE_LIMIT;

  @ApiPropertyOptional({
    description: 'Inclusive lower bound: updatedAt >= updatedSince.',
    format: 'date-time',
    type: String,
  })
  @IsOptional()
  @IsISO8601({ strict: true, strictSeparator: true })
  updatedSince?: string;

  @ApiPropertyOptional({
    description:
      'Inclusive stable extraction upper bound, reused across every page.',
    format: 'date-time',
    type: String,
  })
  @IsOptional()
  @IsISO8601({ strict: true, strictSeparator: true })
  snapshotAt?: string;
}

export class ExternalPageDto<T> {
  @ApiProperty({
    description: 'Resource records in this page.',
    isArray: true,
    type: Object,
  })
  data: T[];

  @ApiProperty({ nullable: true, type: String })
  nextCursor: string | null;

  @ApiProperty({ format: 'date-time', type: String })
  snapshotAt: string;
}

export type ValidatedExternalPageRequest = Readonly<{
  cursor: ExternalCursor | null;
  cursorContext: ExternalCursorContext;
  limit: number;
  snapshotAt: string;
  updatedSince: string | null;
}>;

@Injectable()
export class ExternalPaginationPolicy {
  constructor(private readonly cursorCodec: ExternalCursorCodec) {}

  validate(
    resource: ExternalApiResource,
    request: ExternalPageRequestDto,
  ): ValidatedExternalPageRequest {
    const hasCursor = request.cursor !== undefined;
    const limit = request.limit ?? EXTERNAL_DEFAULT_PAGE_LIMIT;
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > EXTERNAL_MAX_PAGE_LIMIT
    ) {
      throw new BadRequestException('Invalid external page limit');
    }
    for (const timestamp of [request.updatedSince, request.snapshotAt]) {
      if (
        timestamp !== undefined &&
        (typeof timestamp !== 'string' ||
          timestamp !== timestamp.trim() ||
          !isISO8601(timestamp, { strict: true, strictSeparator: true }) ||
          !Number.isFinite(Date.parse(timestamp)))
      ) {
        throw new BadRequestException('Invalid external timestamp filter');
      }
    }
    if (
      hasCursor &&
      (typeof request.cursor !== 'string' || request.cursor.length === 0)
    ) {
      throw invalidExternalCursor();
    }
    if (hasCursor && !request.snapshotAt) {
      throw invalidExternalCursor();
    }
    if (
      request.updatedSince &&
      request.snapshotAt &&
      Date.parse(request.updatedSince) > Date.parse(request.snapshotAt)
    ) {
      if (hasCursor) {
        throw invalidExternalCursor();
      }
      throw new BadRequestException(
        'updatedSince must not be later than snapshotAt',
      );
    }

    const cursorContext = normalizeExternalCursorContext(
      resource,
      request.snapshotAt ?? new Date().toISOString(),
      request.updatedSince ?? null,
    );
    const cursor = hasCursor
      ? this.cursorCodec.decode(request.cursor!, cursorContext)
      : null;

    return Object.freeze({
      cursor,
      cursorContext,
      limit,
      snapshotAt: cursorContext.snapshotAt,
      updatedSince: cursorContext.filters.updatedSince,
    });
  }
}
