import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { IsEmpty, IsUUID } from 'class-validator';
import { CalendarStatus } from '../../calendars/enums/calendar-status.enum';

export class AssignResourceCalendarDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  calendarId: string;
}

export class ReplaceResourceCalendarDto extends AssignResourceCalendarDto {}

export class ClearResourceCalendarAssignmentDto {
  @ApiHideProperty()
  @IsEmpty()
  payload?: never;
}

export enum ResourceCalendarAssignmentState {
  Assigned = 'assigned',
  Unassigned = 'unassigned',
}

export class ResourceCalendarAssignmentResponseDto {
  @ApiProperty({ format: 'uuid' })
  resourceId: string;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  assignedCalendarId: string | null;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  effectiveCalendarId: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  calendarName: string | null;

  @ApiPropertyOptional({ enum: CalendarStatus, nullable: true })
  calendarStatus: CalendarStatus | null;

  @ApiProperty({ enum: ResourceCalendarAssignmentState })
  assignmentState: ResourceCalendarAssignmentState;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  updatedBy: string | null;
}
