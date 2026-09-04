import { ApiProperty } from '@nestjs/swagger';
import { externalTimestamp } from './external-timestamp';

export type ExternalIssueSource = {
  createdAt: Date | string;
  id: string;
  projectId: string;
  severity: string;
  status: string;
  title: string;
  updatedAt: Date | string;
};

export class ExternalIssueDto {
  @ApiProperty({ format: 'uuid', type: String })
  id: string;

  @ApiProperty({ format: 'uuid', type: String })
  projectId: string;

  @ApiProperty({ type: String })
  title: string;

  @ApiProperty({ type: String })
  status: string;

  @ApiProperty({ type: String })
  severity: string;

  @ApiProperty({ format: 'date-time', type: String })
  createdAt: string;

  @ApiProperty({ format: 'date-time', type: String })
  updatedAt: string;
}

export function toExternalIssueDto(
  source: ExternalIssueSource,
): ExternalIssueDto {
  return {
    createdAt: externalTimestamp(source.createdAt),
    id: source.id,
    projectId: source.projectId,
    severity: source.severity,
    status: source.status,
    title: source.title,
    updatedAt: externalTimestamp(source.updatedAt),
  };
}
