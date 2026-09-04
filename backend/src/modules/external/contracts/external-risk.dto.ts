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
  @ApiProperty({ format: 'uuid', type: String })
  id: string;

  @ApiProperty({ format: 'uuid', type: String })
  projectId: string;

  @ApiProperty({ type: String })
  title: string;

  @ApiProperty({ type: String })
  status: string;

  @ApiProperty({ type: String })
  probability: string;

  @ApiProperty({ type: String })
  impact: string;

  @ApiProperty({ format: 'date-time', type: String })
  createdAt: string;

  @ApiProperty({ format: 'date-time', type: String })
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
