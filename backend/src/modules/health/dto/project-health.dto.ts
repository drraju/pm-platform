import { ApiProperty } from '@nestjs/swagger';

export enum ProjectHealthStatus {
  Green = 'GREEN',
  Amber = 'AMBER',
  Red = 'RED',
}

export class ProjectHealthDto {
  @ApiProperty({ enum: ProjectHealthStatus })
  status: ProjectHealthStatus;

  @ApiProperty({ type: String, isArray: true })
  factors: string[];
}
