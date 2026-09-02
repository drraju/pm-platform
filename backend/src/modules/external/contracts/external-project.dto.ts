import { ApiProperty } from '@nestjs/swagger';
import { externalTimestamp } from './external-timestamp';

export type ExternalProjectSource = {
  createdAt: Date | string;
  id: string;
  name: string;
  startDate?: string | null;
  status: string;
  targetEndDate?: string | null;
  updatedAt: Date | string;
};

export class ExternalProjectDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  status: string;

  @ApiProperty({ nullable: true })
  startDate: string | null;

  @ApiProperty({ nullable: true })
  targetEndDate: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt: string;
}

export function toExternalProjectDto(
  source: ExternalProjectSource,
): ExternalProjectDto {
  return {
    createdAt: externalTimestamp(source.createdAt),
    id: source.id,
    name: source.name,
    startDate: source.startDate ?? null,
    status: source.status,
    targetEndDate: source.targetEndDate ?? null,
    updatedAt: externalTimestamp(source.updatedAt),
  };
}
