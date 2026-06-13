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
import { CreateRaidCommentDto } from './dto/create-raid-comment.dto';
import { CreateRaidItemDto } from './dto/create-raid-item.dto';
import { UpdateRaidItemDto } from './dto/update-raid-item.dto';
import { RaidService } from './raid.service';

type AuthenticatedRequest = Request & {
  user?: {
    userId: string;
    email?: string;
    roleId: string;
  };
};

@ApiTags('raid')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('raid')
export class RaidController {
  constructor(private readonly raidService: RaidService) {}

  @Get()
  @RequirePermissions(PermissionKey.RaidRead)
  @ApiOkResponse()
  findAll(@Req() request: AuthenticatedRequest) {
    return this.raidService.findAll(request.user);
  }

  @Post()
  @RequirePermissions(PermissionKey.RaidCreate)
  @ApiCreatedResponse()
  create(
    @Body() createRaidItemDto: CreateRaidItemDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.raidService.create(createRaidItemDto, request.user);
  }

  @Patch(':id')
  @RequirePermissions(PermissionKey.RaidUpdate)
  @ApiOkResponse()
  update(
    @Param('id') id: string,
    @Body() updateRaidItemDto: UpdateRaidItemDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.raidService.update(id, updateRaidItemDto, request.user);
  }

  @Post(':id/comments')
  @RequirePermissions(PermissionKey.RaidUpdate)
  @ApiCreatedResponse()
  addComment(
    @Param('id') id: string,
    @Body() createRaidCommentDto: CreateRaidCommentDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.raidService.addComment(id, createRaidCommentDto, request.user);
  }

  @Delete(':id')
  @RequirePermissions(PermissionKey.RaidDelete)
  @ApiOkResponse()
  remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.raidService.remove(id, request.user);
  }
}
