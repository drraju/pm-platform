import { ApiProperty } from '@nestjs/swagger';
import { externalTimestamp } from './external-timestamp';

export type ExternalRiskSource = {
  createdAt: Date | string;
  id: string;
  impact: string;
  probability: string;
  projectId: string;
  status: string;
  title: string;
  updatedAt: Date | string;
};

export class ExternalRiskDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  probability: string;

  @ApiProperty()
  impact: string;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt: string;
}

export function toExternalRiskDto(source: ExternalRiskSource): ExternalRiskDto {
  return {
    createdAt: externalTimestamp(source.createdAt),
    id: source.id,
    impact: source.impact,
    probability: source.probability,
    projectId: source.projectId,
    status: source.status,
    title: source.title,
    updatedAt: externalTimestamp(source.updatedAt),
  };
}
