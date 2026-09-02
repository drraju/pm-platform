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
import { ExternalCursor, ExternalCursorCodec } from './external-cursor';

export const EXTERNAL_DEFAULT_PAGE_LIMIT = 200;
export const EXTERNAL_MAX_PAGE_LIMIT = 1000;
export const EXTERNAL_PAGE_ORDER = Object.freeze([
  Object.freeze({ direction: 'ASC' as const, field: 'updatedAt' as const }),
  Object.freeze({ direction: 'ASC' as const, field: 'id' as const }),
]);
export const EXTERNAL_UPDATED_SINCE_IS_INCLUSIVE = true;
export const EXTERNAL_SNAPSHOT_BOUNDARY_IS_INCLUSIVE = true;

export class ExternalPageRequestDto {
  @ApiPropertyOptional({ description: 'Opaque signed keyset cursor.' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    default: EXTERNAL_DEFAULT_PAGE_LIMIT,
    maximum: EXTERNAL_MAX_PAGE_LIMIT,
    minimum: 1,
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
  })
  @IsOptional()
  @IsISO8601({ strict: true, strictSeparator: true })
  updatedSince?: string;

  @ApiPropertyOptional({
    description:
      'Inclusive stable extraction upper bound, reused across every page.',
    format: 'date-time',
  })
  @IsOptional()
  @IsISO8601({ strict: true, strictSeparator: true })
  snapshotAt?: string;
}

export class ExternalPageDto<T> {
  @ApiProperty({ isArray: true })
  data: T[];

  @ApiProperty({ nullable: true })
  nextCursor: string | null;

  @ApiProperty({ format: 'date-time' })
  snapshotAt: string;
}

export type ValidatedExternalPageRequest = Readonly<{
  cursor: ExternalCursor | null;
  limit: number;
  snapshotAt: string | null;
  updatedSince: string | null;
}>;

@Injectable()
export class ExternalPaginationPolicy {
  constructor(private readonly cursorCodec: ExternalCursorCodec) {}

  validate(request: ExternalPageRequestDto): ValidatedExternalPageRequest {
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
        timestamp &&
        !isISO8601(timestamp, { strict: true, strictSeparator: true })
      ) {
        throw new BadRequestException('Invalid external timestamp filter');
      }
    }
    if (request.cursor && !request.snapshotAt) {
      throw new BadRequestException(
        'snapshotAt is required when an external cursor is provided',
      );
    }
    if (
      request.updatedSince &&
      request.snapshotAt &&
      Date.parse(request.updatedSince) > Date.parse(request.snapshotAt)
    ) {
      throw new BadRequestException(
        'updatedSince must not be later than snapshotAt',
      );
    }

    const cursor = request.cursor
      ? this.cursorCodec.decode(request.cursor)
      : null;
    if (
      cursor &&
      request.snapshotAt &&
      Date.parse(cursor.updatedAt) > Date.parse(request.snapshotAt)
    ) {
      throw new BadRequestException(
        'External cursor is outside the snapshot boundary',
      );
    }

    return Object.freeze({
      cursor,
      limit,
      snapshotAt: request.snapshotAt ?? null,
      updatedSince: request.updatedSince ?? null,
    });
  }
}
