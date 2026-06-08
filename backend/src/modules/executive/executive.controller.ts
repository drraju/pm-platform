import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../authorization/guards/permissions.guard';
import { PermissionKey } from '../authorization/permissions';
import { ExecutiveSummaryDto } from './dto/executive-summary.dto';
import { ExecutiveService } from './executive.service';

@ApiTags('executive')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('executive')
export class ExecutiveController {
  constructor(private readonly executiveService: ExecutiveService) {}

  @Get('summary')
  @RequirePermissions(PermissionKey.ExecutiveSummaryRead)
  @ApiOperation({ summary: 'Get executive portfolio summary' })
  @ApiOkResponse({ type: ExecutiveSummaryDto })
  getSummary(): Promise<ExecutiveSummaryDto> {
    return this.executiveService.getSummary();
  }
}
