import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { PermissionKey } from '../../common/authz/permissions';
import { PermissionsGuard } from '../../common/authz/permissions.guard';
import { RequirePermissions } from '../../common/authz/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Risk } from '../raid/entities/risk.entity';
import { CreateRiskDto } from './dto/create-risk.dto';
import { UpdateRiskDto } from './dto/update-risk.dto';
import { RisksService } from './risks.service';

type AuthenticatedRequest = Request & {
  user?: {
    userId: string;
    email?: string;
    roleId: string;
  };
};

@ApiTags('risks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('risks')
export class RisksController {
  constructor(private readonly risksService: RisksService) {}

  @Post()
  @RequirePermissions(PermissionKey.RaidCreate)
  @ApiCreatedResponse({ type: Risk })
  create(@Body() createRiskDto: CreateRiskDto): Promise<Risk> {
    return this.risksService.create(createRiskDto);
  }

  @Get()
  @RequirePermissions(PermissionKey.RaidRead)
  @ApiOkResponse({ type: Risk, isArray: true })
  findAll(@Req() request: AuthenticatedRequest): Promise<Risk[]> {
    return this.risksService.findAll(request.user);
  }

  @Get(':id')
  @RequirePermissions(PermissionKey.RaidRead)
  @ApiOkResponse({ type: Risk })
  findOne(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<Risk> {
    return this.risksService.findOne(id, request.user);
  }

  @Patch(':id')
  @RequirePermissions(PermissionKey.RaidUpdate)
  @ApiOkResponse({ type: Risk })
  update(
    @Param('id') id: string,
    @Body() updateRiskDto: UpdateRiskDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<Risk> {
    return this.risksService.update(id, updateRiskDto, request.user);
  }

  @Delete(':id')
  @RequirePermissions(PermissionKey.RaidDelete)
  @ApiOkResponse()
  remove(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    return this.risksService.remove(id, request.user);
  }
}
