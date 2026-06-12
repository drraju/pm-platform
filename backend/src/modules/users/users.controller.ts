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
} from '../../common/authz/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AssignableUserResponseDto } from './dto/assignable-user-response.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { PermissionResponseDto } from './dto/permission-response.dto';
import { RoleResponseDto } from './dto/role-response.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermissions(PermissionKey.UserManage)
  @ApiCreatedResponse({ type: UserResponseDto })
  create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto);
  }

  @Get('roles')
  @RequirePermissions(PermissionKey.RoleManage)
  @ApiOkResponse({ type: RoleResponseDto, isArray: true })
  findRoles(): Promise<RoleResponseDto[]> {
    return this.usersService.findRoles();
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
  @ApiOkResponse({ type: RoleResponseDto })
  updateRolePermissions(
    @Param('id') id: string,
    @Body() updateRolePermissionsDto: UpdateRolePermissionsDto,
  ): Promise<RoleResponseDto> {
    return this.usersService.updateRolePermissions(
      id,
      updateRolePermissionsDto,
    );
  }

  @Get()
  @RequirePermissions(PermissionKey.UserManage)
  @ApiOkResponse({ type: UserResponseDto, isArray: true })
  findAll(): Promise<UserResponseDto[]> {
    return this.usersService.findAll();
  }

  @Get('assignable')
  @RequireAnyPermissions(
    PermissionKey.ProjectRead,
    PermissionKey.ProjectTeamManage,
  )
  @ApiOkResponse({ type: AssignableUserResponseDto, isArray: true })
  findAssignable(): Promise<AssignableUserResponseDto[]> {
    return this.usersService.findAssignableUsers();
  }

  @Get(':id')
  @RequirePermissions(PermissionKey.UserManage)
  @ApiOkResponse({ type: UserResponseDto })
  findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PermissionKey.UserManage)
  @ApiOkResponse({ type: UserResponseDto })
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @RequirePermissions(PermissionKey.UserManage)
  @ApiOkResponse()
  remove(@Param('id') id: string): Promise<void> {
    return this.usersService.remove(id);
  }
}
