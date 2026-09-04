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
  @ApiProperty({ format: 'uuid', type: String })
  id: string;

  @ApiProperty({ type: String })
  name: string;

  @ApiProperty({ type: String })
  status: string;

  @ApiProperty({ format: 'date', nullable: true, type: String })
  startDate: string | null;

  @ApiProperty({ format: 'date', nullable: true, type: String })
  targetEndDate: string | null;

  @ApiProperty({ format: 'date-time', type: String })
  createdAt: string;

  @ApiProperty({ format: 'date-time', type: String })
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
