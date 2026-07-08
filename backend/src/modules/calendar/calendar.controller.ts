import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { PermissionKey } from '../../common/authz/permissions';
import { PermissionsGuard } from '../../common/authz/permissions.guard';
import {
  RequireAnyPermissions,
  RequirePermissions,
} from '../../common/authz/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CalendarService, DEFAULT_ORGANIZATION_ID } from './calendar.service';
import {
  CalendarResponseDto,
  CreateCalendarDto,
  UpdateCalendarDto,
} from './dto/calendar.dto';
import {
  CreateExceptionDayDto,
  ExceptionDayResponseDto,
  UpdateExceptionDayDto,
} from './dto/exception-day.dto';
import {
  CreateHolidayDto,
  HolidayResponseDto,
  UpdateHolidayDto,
} from './dto/holiday.dto';
import {
  CreateWorkingHoursDto,
  UpdateWorkingHoursDto,
  WorkingHoursResponseDto,
} from './dto/working-hours.dto';

@ApiTags('calendar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Post()
  @RequirePermissions(PermissionKey.ProjectUpdate)
  @ApiOperation({ summary: 'Create an enterprise calendar' })
  @ApiCreatedResponse({ type: CalendarResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid calendar payload' })
  @ApiConflictResponse({
    description: 'Calendar name or default already exists',
  })
  @ApiUnprocessableEntityResponse({
    description: 'Unsupported calendar metadata',
  })
  createCalendar(
    @Headers('x-organization-id') organizationId: string | undefined,
    @Body() input: CreateCalendarDto,
  ): Promise<CalendarResponseDto> {
    return this.calendarService.createCalendar(
      this.resolveOrganizationId(organizationId),
      input,
    );
  }

  @Get()
  @RequireAnyPermissions(PermissionKey.ProjectRead, PermissionKey.ProjectUpdate)
  @ApiOperation({ summary: 'List enterprise calendars' })
  @ApiOkResponse({ type: CalendarResponseDto, isArray: true })
  listCalendars(
    @Headers('x-organization-id') organizationId: string | undefined,
  ): Promise<CalendarResponseDto[]> {
    return this.calendarService.listCalendars(
      this.resolveOrganizationId(organizationId),
    );
  }

  @Get(':id/working-hours')
  @RequireAnyPermissions(PermissionKey.ProjectRead, PermissionKey.ProjectUpdate)
  @ApiOperation({ summary: 'List calendar working hours' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: WorkingHoursResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Calendar not found' })
  listWorkingHours(
    @Headers('x-organization-id') organizationId: string | undefined,
    @Param('id') id: string,
  ): Promise<WorkingHoursResponseDto[]> {
    return this.calendarService.listWorkingHours(
      this.resolveOrganizationId(organizationId),
      id,
    );
  }

  @Post(':id/working-hours')
  @RequirePermissions(PermissionKey.ProjectUpdate)
  @ApiOperation({ summary: 'Create calendar working hours' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiCreatedResponse({ type: WorkingHoursResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid working hours payload' })
  @ApiNotFoundResponse({ description: 'Calendar not found' })
  createWorkingHours(
    @Headers('x-organization-id') organizationId: string | undefined,
    @Param('id') id: string,
    @Body() input: CreateWorkingHoursDto,
  ): Promise<WorkingHoursResponseDto> {
    return this.calendarService.createWorkingHours(
      this.resolveOrganizationId(organizationId),
      id,
      input,
    );
  }

  @Put(':id/working-hours/:workingHourId')
  @RequirePermissions(PermissionKey.ProjectUpdate)
  @ApiOperation({ summary: 'Replace calendar working hours' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'workingHourId' })
  @ApiOkResponse({ type: WorkingHoursResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid working hours payload' })
  @ApiNotFoundResponse({ description: 'Calendar or working hours not found' })
  updateWorkingHours(
    @Headers('x-organization-id') organizationId: string | undefined,
    @Param('id') id: string,
    @Param('workingHourId') workingHourId: string,
    @Body() input: UpdateWorkingHoursDto,
  ): Promise<WorkingHoursResponseDto> {
    return this.calendarService.updateWorkingHours(
      this.resolveOrganizationId(organizationId),
      id,
      workingHourId,
      input,
    );
  }

  @Delete(':id/working-hours/:workingHourId')
  @RequirePermissions(PermissionKey.ProjectUpdate)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete calendar working hours' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'workingHourId' })
  @ApiNoContentResponse({ description: 'Working hours deleted' })
  @ApiNotFoundResponse({ description: 'Calendar or working hours not found' })
  deleteWorkingHours(
    @Headers('x-organization-id') organizationId: string | undefined,
    @Param('id') id: string,
    @Param('workingHourId') workingHourId: string,
  ): Promise<void> {
    return this.calendarService.deleteWorkingHours(
      this.resolveOrganizationId(organizationId),
      id,
      workingHourId,
    );
  }

  @Get(':id/holidays')
  @RequireAnyPermissions(PermissionKey.ProjectRead, PermissionKey.ProjectUpdate)
  @ApiOperation({ summary: 'List calendar holidays' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: HolidayResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Calendar not found' })
  listHolidays(
    @Headers('x-organization-id') organizationId: string | undefined,
    @Param('id') id: string,
  ): Promise<HolidayResponseDto[]> {
    return this.calendarService.listHolidays(
      this.resolveOrganizationId(organizationId),
      id,
    );
  }

  @Post(':id/holidays')
  @RequirePermissions(PermissionKey.ProjectUpdate)
  @ApiOperation({ summary: 'Create calendar holiday' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiCreatedResponse({ type: HolidayResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid holiday payload' })
  @ApiConflictResponse({ description: 'Holiday date already exists' })
  @ApiNotFoundResponse({ description: 'Calendar not found' })
  createHoliday(
    @Headers('x-organization-id') organizationId: string | undefined,
    @Param('id') id: string,
    @Body() input: CreateHolidayDto,
  ): Promise<HolidayResponseDto> {
    return this.calendarService.createHoliday(
      this.resolveOrganizationId(organizationId),
      id,
      input,
    );
  }

  @Put(':id/holidays/:holidayId')
  @RequirePermissions(PermissionKey.ProjectUpdate)
  @ApiOperation({ summary: 'Replace calendar holiday' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'holidayId', format: 'uuid' })
  @ApiOkResponse({ type: HolidayResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid holiday payload' })
  @ApiConflictResponse({ description: 'Holiday date already exists' })
  @ApiNotFoundResponse({ description: 'Calendar or holiday not found' })
  updateHoliday(
    @Headers('x-organization-id') organizationId: string | undefined,
    @Param('id') id: string,
    @Param('holidayId') holidayId: string,
    @Body() input: UpdateHolidayDto,
  ): Promise<HolidayResponseDto> {
    return this.calendarService.updateHoliday(
      this.resolveOrganizationId(organizationId),
      id,
      holidayId,
      input,
    );
  }

  @Delete(':id/holidays/:holidayId')
  @RequirePermissions(PermissionKey.ProjectUpdate)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete calendar holiday' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'holidayId', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Holiday deleted' })
  @ApiNotFoundResponse({ description: 'Calendar or holiday not found' })
  deleteHoliday(
    @Headers('x-organization-id') organizationId: string | undefined,
    @Param('id') id: string,
    @Param('holidayId') holidayId: string,
  ): Promise<void> {
    return this.calendarService.deleteHoliday(
      this.resolveOrganizationId(organizationId),
      id,
      holidayId,
    );
  }

  @Get(':id/exceptions')
  @RequireAnyPermissions(PermissionKey.ProjectRead, PermissionKey.ProjectUpdate)
  @ApiOperation({ summary: 'List calendar exception days' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ExceptionDayResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Calendar not found' })
  listExceptionDays(
    @Headers('x-organization-id') organizationId: string | undefined,
    @Param('id') id: string,
  ): Promise<ExceptionDayResponseDto[]> {
    return this.calendarService.listExceptionDays(
      this.resolveOrganizationId(organizationId),
      id,
    );
  }

  @Post(':id/exceptions')
  @RequirePermissions(PermissionKey.ProjectUpdate)
  @ApiOperation({ summary: 'Create calendar exception day' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiCreatedResponse({ type: ExceptionDayResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid exception payload' })
  @ApiConflictResponse({ description: 'Exception date already exists' })
  @ApiNotFoundResponse({ description: 'Calendar not found' })
  @ApiUnprocessableEntityResponse({
    description: 'Invalid exception semantics',
  })
  createExceptionDay(
    @Headers('x-organization-id') organizationId: string | undefined,
    @Param('id') id: string,
    @Body() input: CreateExceptionDayDto,
  ): Promise<ExceptionDayResponseDto> {
    return this.calendarService.createExceptionDay(
      this.resolveOrganizationId(organizationId),
      id,
      input,
    );
  }

  @Put(':id/exceptions/:exceptionId')
  @RequirePermissions(PermissionKey.ProjectUpdate)
  @ApiOperation({ summary: 'Replace calendar exception day' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'exceptionId', format: 'uuid' })
  @ApiOkResponse({ type: ExceptionDayResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid exception payload' })
  @ApiConflictResponse({ description: 'Exception date already exists' })
  @ApiNotFoundResponse({ description: 'Calendar or exception not found' })
  @ApiUnprocessableEntityResponse({
    description: 'Invalid exception semantics',
  })
  updateExceptionDay(
    @Headers('x-organization-id') organizationId: string | undefined,
    @Param('id') id: string,
    @Param('exceptionId') exceptionId: string,
    @Body() input: UpdateExceptionDayDto,
  ): Promise<ExceptionDayResponseDto> {
    return this.calendarService.updateExceptionDay(
      this.resolveOrganizationId(organizationId),
      id,
      exceptionId,
      input,
    );
  }

  @Delete(':id/exceptions/:exceptionId')
  @RequirePermissions(PermissionKey.ProjectUpdate)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete calendar exception day' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'exceptionId', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Exception day deleted' })
  @ApiNotFoundResponse({ description: 'Calendar or exception not found' })
  deleteExceptionDay(
    @Headers('x-organization-id') organizationId: string | undefined,
    @Param('id') id: string,
    @Param('exceptionId') exceptionId: string,
  ): Promise<void> {
    return this.calendarService.deleteExceptionDay(
      this.resolveOrganizationId(organizationId),
      id,
      exceptionId,
    );
  }

  @Get(':id')
  @RequireAnyPermissions(PermissionKey.ProjectRead, PermissionKey.ProjectUpdate)
  @ApiOperation({ summary: 'Get enterprise calendar detail' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: CalendarResponseDto })
  @ApiNotFoundResponse({ description: 'Calendar not found' })
  getCalendar(
    @Headers('x-organization-id') organizationId: string | undefined,
    @Param('id') id: string,
  ): Promise<CalendarResponseDto> {
    return this.calendarService.getCalendar(
      this.resolveOrganizationId(organizationId),
      id,
    );
  }

  @Put(':id')
  @RequirePermissions(PermissionKey.ProjectUpdate)
  @ApiOperation({ summary: 'Replace enterprise calendar' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: CalendarResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid calendar payload' })
  @ApiConflictResponse({
    description: 'Calendar name or default already exists',
  })
  @ApiNotFoundResponse({ description: 'Calendar not found' })
  @ApiUnprocessableEntityResponse({
    description: 'Unsupported calendar metadata',
  })
  replaceCalendar(
    @Headers('x-organization-id') organizationId: string | undefined,
    @Param('id') id: string,
    @Body() input: CreateCalendarDto,
  ): Promise<CalendarResponseDto> {
    return this.calendarService.replaceCalendar(
      this.resolveOrganizationId(organizationId),
      id,
      input,
    );
  }

  @Patch(':id')
  @RequirePermissions(PermissionKey.ProjectUpdate)
  @ApiOperation({ summary: 'Update enterprise calendar' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: CalendarResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid calendar payload' })
  @ApiConflictResponse({
    description: 'Calendar name or default already exists',
  })
  @ApiNotFoundResponse({ description: 'Calendar not found' })
  @ApiUnprocessableEntityResponse({
    description: 'Unsupported calendar metadata',
  })
  updateCalendar(
    @Headers('x-organization-id') organizationId: string | undefined,
    @Param('id') id: string,
    @Body() input: UpdateCalendarDto,
  ): Promise<CalendarResponseDto> {
    return this.calendarService.updateCalendar(
      this.resolveOrganizationId(organizationId),
      id,
      input,
    );
  }

  @Delete(':id')
  @RequirePermissions(PermissionKey.ProjectUpdate)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive enterprise calendar' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Calendar archived' })
  @ApiNotFoundResponse({ description: 'Calendar not found' })
  deleteCalendar(
    @Headers('x-organization-id') organizationId: string | undefined,
    @Param('id') id: string,
  ): Promise<void> {
    return this.calendarService.deleteCalendar(
      this.resolveOrganizationId(organizationId),
      id,
    );
  }

  private resolveOrganizationId(organizationId?: string) {
    return organizationId?.trim() || DEFAULT_ORGANIZATION_ID;
  }
}
