import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PermissionKey } from '../../common/authz/permissions';
import { PermissionsGuard } from '../../common/authz/permissions.guard';
import { RequireAnyPermissions, RequirePermissions } from '../../common/authz/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, CustomerListQueryDto, UpdateCustomerDto } from './dto/customer.dto';
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
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @RequireAnyPermissions(PermissionKey.CustomerRead, PermissionKey.ProjectRead)
  @ApiOkResponse()
  list(@Req() request: AuthenticatedRequest, @Query() query: CustomerListQueryDto) {
    return this.customersService.list(request.user, query.status ?? 'active');
  }

  @Get('owners')
  @RequirePermissions(PermissionKey.CustomerManage)
  @ApiOkResponse()
  listOwners(@Req() request: AuthenticatedRequest) {
    return this.customersService.listOwners(request.user);
  }

  @Get('access')
  @RequirePermissions(PermissionKey.CustomerRead)
  @ApiOkResponse()
  access(@Req() request: AuthenticatedRequest) {
    return this.customersService.access(request.user);
  }

  @Get(':id/projects')
  @RequireAnyPermissions(PermissionKey.CustomerRead, PermissionKey.ProjectRead)
  @ApiOkResponse()
  listProjects(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.customersService.listProjects(request.user, id);
  }

  @Get(':id')
  @RequireAnyPermissions(PermissionKey.CustomerRead, PermissionKey.ProjectRead)
  @ApiOkResponse()
  get(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.customersService.get(request.user, id);
  }

  @Post()
  @RequirePermissions(PermissionKey.CustomerManage)
  @ApiCreatedResponse()
  create(@Req() request: AuthenticatedRequest, @Body() body: CreateCustomerDto) {
    return this.customersService.create(request.user, body);
  }

  @Patch(':id')
  @RequirePermissions(PermissionKey.CustomerManage)
  @ApiOkResponse()
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: UpdateCustomerDto,
  ) {
    return this.customersService.update(request.user, id, body);
  }
}
