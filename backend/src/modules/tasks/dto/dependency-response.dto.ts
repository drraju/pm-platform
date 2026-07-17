import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskDependencyType } from '../../../common/enums/task-dependency-type.enum';
import { TaskKind } from '../../../common/enums/task-kind.enum';
import { TaskStatus } from '../../../common/enums/task-status.enum';
import {
  DependencyBlockedState,
  DependencyHealth,
  DependencyImpactLevel,
} from '../dependency-domain';

export class DependencyEndpointResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  projectId: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ enum: TaskStatus })
  status: TaskStatus;

  @ApiPropertyOptional({ enum: TaskKind, nullable: true })
  taskKind: TaskKind | null;

  @ApiPropertyOptional({ nullable: true })
  sequenceNumber: number | null;
}

export class DependencyTraversalNodeResponseDto {
  @ApiProperty({ format: 'uuid' })
  taskId: string;

  @ApiProperty({ minimum: 1 })
  depth: number;
}

export class DependencyTraversalResponseDto {
  @ApiProperty({ format: 'uuid' })
  rootTaskId: string;

  @ApiProperty({ format: 'uuid', isArray: true })
  impactedTaskIds: string[];

  @ApiProperty({ format: 'uuid', isArray: true })
  traversedDependencyIds: string[];

  @ApiProperty({ type: DependencyTraversalNodeResponseDto, isArray: true })
  nodes: DependencyTraversalNodeResponseDto[];

  @ApiProperty()
  truncated: boolean;
}

export class DependencyImpactResponseDto {
  @ApiProperty()
  directTaskCount: number;

  @ApiProperty()
  impactedTaskCount: number;

  @ApiProperty()
  maxDepthReached: number;

  @ApiProperty({ enum: DependencyImpactLevel })
  level: DependencyImpactLevel;

  @ApiProperty({ type: DependencyTraversalResponseDto })
  traversal: DependencyTraversalResponseDto;
}

export class DependencyResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: TaskDependencyType })
  dependencyType: TaskDependencyType;

  @ApiProperty()
  lagDays: number;

  @ApiProperty({ type: DependencyEndpointResponseDto })
  predecessor: DependencyEndpointResponseDto;

  @ApiProperty({ type: DependencyEndpointResponseDto })
  successor: DependencyEndpointResponseDto;

  @ApiProperty({ enum: DependencyHealth })
  health: DependencyHealth;

  @ApiProperty({ example: 'constraint_met' })
  healthReason: string;

  @ApiProperty({ enum: DependencyBlockedState })
  blockedState: DependencyBlockedState;

  @ApiProperty({ type: DependencyImpactResponseDto })
  impact: DependencyImpactResponseDto;
}

export class DependencyCollectionResponseDto {
  @ApiProperty({ type: DependencyResponseDto, isArray: true })
  items: DependencyResponseDto[];

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  totalPages: number;
}
