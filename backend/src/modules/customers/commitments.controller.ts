import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PermissionKey } from '../../common/authz/permissions';
import { PermissionsGuard } from '../../common/authz/permissions.guard';
import { RequireAnyPermissions, RequirePermissions } from '../../common/authz/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommitmentsService } from './commitments.service';
import { CreateCommitmentDto, UpdateCommitmentDto } from './dto/commitment.dto';
import type { Request } from 'express';

type AuthenticatedRequest = Request & {
  user: {
    email?: string;
    roleId: string;
    userId: string;
  };
};

@ApiTags('customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('customers/:customerId/commitments')
export class CustomerCommitmentsController {
  constructor(private readonly commitmentsService: CommitmentsService) {}

  @Get()
  @RequirePermissions(PermissionKey.CustomerSuccessView)
  @ApiOkResponse()
  list(@Req() request: AuthenticatedRequest, @Param('customerId') customerId: string) {
    return this.commitmentsService.listForCustomer(request.user, customerId);
  }

  @Post()
  @RequirePermissions(PermissionKey.CustomerSuccessView)
  @ApiCreatedResponse()
  create(
    @Req() request: AuthenticatedRequest,
    @Param('customerId') customerId: string,
    @Body() body: CreateCommitmentDto,
  ) {
    return this.commitmentsService.create(request.user, customerId, body);
  }

  @Patch(':commitmentId')
  @RequirePermissions(PermissionKey.CustomerSuccessView)
  @ApiOkResponse()
  update(
    @Req() request: AuthenticatedRequest,
    @Param('customerId') customerId: string,
    @Param('commitmentId') commitmentId: string,
    @Body() body: UpdateCommitmentDto,
  ) {
    return this.commitmentsService.update(request.user, customerId, commitmentId, body);
  }
}

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('projects/:projectId/commitments')
export class ProjectCommitmentsController {
  constructor(private readonly commitmentsService: CommitmentsService) {}

  @Get()
  @RequireAnyPermissions(PermissionKey.ProjectRead, PermissionKey.WorkUpdate)
  @ApiOkResponse()
  list(@Req() request: AuthenticatedRequest, @Param('projectId') projectId: string) {
    return this.commitmentsService.listForProject(request.user, projectId);
  }

  @Post(':commitmentId/accept')
  @RequireAnyPermissions(PermissionKey.ProjectRead, PermissionKey.WorkUpdate, PermissionKey.ProjectLead)
  @ApiOkResponse()
  accept(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('commitmentId') commitmentId: string,
  ) {
    return this.commitmentsService.accept(request.user, projectId, commitmentId);
  }
}
