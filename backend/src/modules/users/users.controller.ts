import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PermissionKey } from '../../common/authz/permissions';
import { PermissionsGuard } from '../../common/authz/permissions.guard';
import {
  RequireAnyPermissions,
  RequirePermissions,
  RequirePlatformAdmin,
} from '../../common/authz/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PasswordUpdateService } from '../auth/password-update.service';
import { AdminResetPasswordDto } from './dto/admin-reset-password.dto';
import { AssignableUserResponseDto } from './dto/assignable-user-response.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { PermissionResponseDto } from './dto/permission-response.dto';
import { RoleResponseDto } from './dto/role-response.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';
import type { Request } from 'express';

type AuthenticatedRequest = Request & {
  user: {
    email?: string;
    roleId: string;
    userId: string;
  };
};

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordUpdateService: PasswordUpdateService,
  ) {}

  @Post()
  @RequirePermissions(PermissionKey.UserManage)
  @ApiCreatedResponse({ type: UserResponseDto })
  async create(
    @Req() request: AuthenticatedRequest,
    @Body() createUserDto: CreateUserDto,
  ): Promise<UserResponseDto> {
    const passwordHash = await this.passwordUpdateService.hashTemporaryPassword(
      createUserDto.password,
    );
    return this.usersService.create(
      {
        email: createUserDto.email,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        passwordHash,
        roleId: createUserDto.roleId,
        status: 'first_login_pending',
      },
      request.user,
    );
  }

  @Get('roles')
  @RequirePermissions(PermissionKey.RoleManage)
  @ApiOkResponse({ type: RoleResponseDto, isArray: true })
  findRoles(@Req() request: AuthenticatedRequest): Promise<RoleResponseDto[]> {
    return this.usersService.findRoles(request.user);
  }

  @Post('roles')
  @RequirePermissions(PermissionKey.RoleManage)
  @ApiCreatedResponse({ type: RoleResponseDto })
  createRole(@Body() createRoleDto: CreateRoleDto): Promise<RoleResponseDto> {
    return this.usersService.createRole(createRoleDto);
  }

  @Get('permissions')
  @RequirePermissions(PermissionKey.PermissionManage)
  @ApiOkResponse({ type: PermissionResponseDto, isArray: true })
  findPermissions(): Promise<PermissionResponseDto[]> {
    return this.usersService.findPermissions();
  }

  @Patch('roles/:id/permissions')
  @RequirePermissions(PermissionKey.PermissionManage)
  @RequirePlatformAdmin()
  @ApiOkResponse({ type: RoleResponseDto })
  updateRolePermissions(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateRolePermissionsDto: UpdateRolePermissionsDto,
  ): Promise<RoleResponseDto> {
    return this.usersService.updateRolePermissions(
      id,
      updateRolePermissionsDto,
      request.user,
    );
  }

  @Get()
  @RequirePermissions(PermissionKey.UserManage)
  @ApiOkResponse({ type: UserResponseDto, isArray: true })
  findAll(@Req() request: AuthenticatedRequest): Promise<UserResponseDto[]> {
    return this.usersService.findAll(request.user);
  }

  @Get('assignable')
  @RequireAnyPermissions(
    PermissionKey.ProjectRead,
    PermissionKey.ProjectTeamManage,
  )
  @ApiOkResponse({ type: AssignableUserResponseDto, isArray: true })
  findAssignable(
    @Req() request: AuthenticatedRequest,
    @Query('projectId') projectId?: string,
  ): Promise<AssignableUserResponseDto[]> {
    return this.usersService.findAssignableUsers(request.user, projectId);
  }

  @Get(':id')
  @RequirePermissions(PermissionKey.UserManage)
  @ApiOkResponse({ type: UserResponseDto })
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<UserResponseDto> {
    return this.usersService.findOne(id, request.user);
  }

  @Patch(':id')
  @RequirePermissions(PermissionKey.UserManage)
  @ApiOkResponse({ type: UserResponseDto })
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, updateUserDto, request.user);
  }

  @Post(':id/reset-password')
  @RequirePermissions(PermissionKey.UserManage)
  @ApiOkResponse({ type: UserResponseDto })
  async resetPassword(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() adminResetPasswordDto: AdminResetPasswordDto,
  ): Promise<UserResponseDto> {
    await this.usersService.ensurePlatformAdmin(request.user);
    if (request.user.userId === id) {
      return this.usersService.recordAdminPasswordReset(id, request.user);
    }
    await this.passwordUpdateService.adminResetPassword(
      id,
      adminResetPasswordDto.temporaryPassword,
      {
        ipAddress: request.ip,
        userAgent: request.get('user-agent'),
      },
    );
    return this.usersService.recordAdminPasswordReset(id, request.user);
  }

  @Post(':id/enable')
  @RequirePermissions(PermissionKey.UserManage)
  @ApiOkResponse({ type: UserResponseDto })
  enable(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<UserResponseDto> {
    return this.usersService.enable(id, request.user);
  }

  @Post(':id/disable')
  @RequirePermissions(PermissionKey.UserManage)
  @ApiOkResponse({ type: UserResponseDto })
  disable(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<UserResponseDto> {
    return this.usersService.disable(id, request.user);
  }

  @Delete(':id')
  @RequirePermissions(PermissionKey.UserManage)
  @ApiOkResponse()
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<void> {
    return this.usersService.remove(id, request.user);
  }
}
