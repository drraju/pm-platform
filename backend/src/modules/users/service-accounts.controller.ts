import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import { PermissionKey } from '../../common/authz/permissions';
import { PermissionsGuard } from '../../common/authz/permissions.guard';
import {
  RequirePermissions,
  RequirePlatformAdmin,
} from '../../common/authz/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateServiceAccountDto } from './dto/create-service-account.dto';
import { RotateServiceAccountCredentialsDto } from './dto/rotate-service-account-credentials.dto';
import { UpdateServiceAccountDto } from './dto/update-service-account.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { ServiceAccountAdministrationService } from './service-account-administration.service';
import type { Request } from 'express';

type AuthenticatedRequest = Request & {
  user: {
    email?: string;
    roleId: string;
    userId: string;
  };
};

@ApiTags('service-accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PermissionKey.UserManage)
@RequirePlatformAdmin()
@Controller('users/service-accounts')
export class ServiceAccountsController {
  constructor(
    private readonly serviceAccounts: ServiceAccountAdministrationService,
  ) {}

  @Post()
  @ApiCreatedResponse({ type: UserResponseDto })
  create(
    @Req() request: AuthenticatedRequest,
    @Body() input: CreateServiceAccountDto,
  ): Promise<UserResponseDto> {
    return this.serviceAccounts.create(input, request.user);
  }

  @Get()
  @ApiOkResponse({ type: UserResponseDto, isArray: true })
  findAll(@Req() request: AuthenticatedRequest): Promise<UserResponseDto[]> {
    return this.serviceAccounts.findAll(request.user);
  }

  @Get(':id')
  @ApiOkResponse({ type: UserResponseDto })
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<UserResponseDto> {
    return this.serviceAccounts.findOne(id, request.user);
  }

  @Patch(':id')
  @ApiOkResponse({ type: UserResponseDto })
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() input: UpdateServiceAccountDto,
  ): Promise<UserResponseDto> {
    return this.serviceAccounts.update(id, input, request.user);
  }

  @Post(':id/rotate-credentials')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: UserResponseDto })
  rotateCredentials(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() input: RotateServiceAccountCredentialsDto,
  ): Promise<UserResponseDto> {
    return this.serviceAccounts.rotateCredentials(id, input, request.user, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    });
  }

  @Post(':id/enable')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: UserResponseDto })
  enable(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<UserResponseDto> {
    return this.serviceAccounts.enable(id, request.user);
  }

  @Post(':id/disable')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: UserResponseDto })
  disable(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<UserResponseDto> {
    return this.serviceAccounts.disable(id, request.user);
  }
}
