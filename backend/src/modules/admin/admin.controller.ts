import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminService } from './admin.service';
import {
  AdminCreateUserDto,
  AdminPermissionDto,
  AdminProjectMembershipDto,
  AdminResetPasswordDto,
  AdminRoleDto,
  AdminRoleMatrixDto,
  AdminUpdateUserDto,
} from './dto/admin.dto';
import { AdminGuard } from './guards/admin.guard';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOkResponse()
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('users')
  findUsers() {
    return this.adminService.findUsers();
  }

  @Post('users')
  createUser(@Body() dto: AdminCreateUserDto) {
    return this.adminService.createUser(dto);
  }

  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() dto: AdminUpdateUserDto) {
    return this.adminService.updateUser(id, dto);
  }

  @Patch('users/:id/disable')
  disableUser(@Param('id') id: string) {
    return this.adminService.disableUser(id);
  }

  @Post('users/:id/reset-password')
  resetPassword(@Param('id') id: string, @Body() dto: AdminResetPasswordDto) {
    return this.adminService.resetPassword(id, dto);
  }

  @Get('roles')
  findRoles() {
    return this.adminService.findRoles();
  }

  @Post('roles')
  createRole(@Body() dto: AdminRoleDto) {
    return this.adminService.createRole(dto);
  }

  @Patch('roles/:id')
  updateRole(@Param('id') id: string, @Body() dto: AdminRoleDto) {
    return this.adminService.updateRole(id, dto);
  }

  @Post('roles/:id/clone')
  cloneRole(@Param('id') id: string) {
    return this.adminService.cloneRole(id);
  }

  @Get('permissions')
  findPermissions() {
    return this.adminService.findPermissions();
  }

  @Post('permissions')
  createPermission(@Body() dto: AdminPermissionDto) {
    return this.adminService.createPermission(dto);
  }

  @Get('role-matrix')
  getRoleMatrix() {
    return this.adminService.getRoleMatrix();
  }

  @Patch('role-matrix')
  updateRoleMatrix(@Body() dto: AdminRoleMatrixDto) {
    return this.adminService.updateRoleMatrix(dto);
  }

  @Get('project-memberships')
  findProjectMemberships() {
    return this.adminService.findProjectMemberships();
  }

  @Post('project-memberships')
  upsertProjectMembership(@Body() dto: AdminProjectMembershipDto) {
    return this.adminService.upsertProjectMembership(dto);
  }

  @Delete('project-memberships/:projectId/:userId')
  removeProjectMembership(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
  ) {
    return this.adminService.removeProjectMembership(projectId, userId);
  }
}
