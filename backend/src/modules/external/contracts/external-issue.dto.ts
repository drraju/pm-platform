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
  @ApiProperty()
  id: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  severity: string;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;

  @ApiProperty({ format: 'date-time' })
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
