import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
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
import { CreateRaidItemDto } from './dto/create-raid-item.dto';
import { RaidService } from './raid.service';

type AuthenticatedRequest = Request & {
  user: AuthenticatedPrincipal;
};

@ApiTags('raid')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('raid')
export class RaidController {
  constructor(private readonly raidService: RaidService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionKey.RaidReadAll, PermissionKey.RaidReadAssigned)
  @ApiOkResponse()
  findAll(@Req() request: AuthenticatedRequest) {
    return this.raidService.findAllForUser(request.user);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionKey.RaidCreate)
  @ApiCreatedResponse()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() createRaidItemDto: CreateRaidItemDto,
  ) {
    return this.raidService.createForUser(request.user, createRaidItemDto);
  }
}
