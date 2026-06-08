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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedPrincipal } from '../authorization/authorization.service';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../authorization/guards/permissions.guard';
import { PermissionKey } from '../authorization/permissions';
import { Risk } from '../raid/entities/risk.entity';
import { CreateRiskDto } from './dto/create-risk.dto';
import { UpdateRiskDto } from './dto/update-risk.dto';
import { RisksService } from './risks.service';

type AuthenticatedRequest = Request & {
  user: AuthenticatedPrincipal;
};

@ApiTags('risks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('risks')
export class RisksController {
  constructor(private readonly risksService: RisksService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionKey.RaidCreate)
  @ApiCreatedResponse({ type: Risk })
  create(
    @Req() request: AuthenticatedRequest,
    @Body() createRiskDto: CreateRiskDto,
  ): Promise<Risk> {
    return this.risksService.createForUser(request.user, createRiskDto);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionKey.RaidReadAll, PermissionKey.RaidReadAssigned)
  @ApiOkResponse({ type: Risk, isArray: true })
  findAll(@Req() request: AuthenticatedRequest): Promise<Risk[]> {
    return this.risksService.findAllForUser(request.user);
  }

  @Get(':id')
  @ApiOkResponse({ type: Risk })
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<Risk> {
    return this.risksService.findOneForUser(request.user, id);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionKey.RaidUpdateAny, PermissionKey.RaidUpdateOwn)
  @ApiOkResponse({ type: Risk })
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateRiskDto: UpdateRiskDto,
  ): Promise<Risk> {
    return this.risksService.updateForUser(request.user, id, updateRiskDto);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionKey.RaidDelete)
  @ApiOkResponse()
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<void> {
    return this.risksService.removeForUser(request.user, id);
  }
}
