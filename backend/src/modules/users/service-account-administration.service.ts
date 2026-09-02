import { Injectable } from '@nestjs/common';
import {
  PasswordChangeAuditContext,
  PasswordUpdateService,
} from '../auth/password-update.service';
import { CreateServiceAccountDto } from './dto/create-service-account.dto';
import { RotateServiceAccountCredentialsDto } from './dto/rotate-service-account-credentials.dto';
import { UpdateServiceAccountDto } from './dto/update-service-account.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserAdministrationActor, UsersService } from './users.service';

@Injectable()
export class ServiceAccountAdministrationService {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordUpdateService: PasswordUpdateService,
  ) {}

  async create(
    input: CreateServiceAccountDto,
    actor: UserAdministrationActor,
  ): Promise<UserResponseDto> {
    await this.usersService.ensurePlatformAdmin(actor);
    const passwordHash = await this.passwordUpdateService.hashTemporaryPassword(
      input.password,
    );
    return this.usersService.createServiceAccount(
      {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        passwordHash,
      },
      actor,
    );
  }

  findAll(actor: UserAdministrationActor): Promise<UserResponseDto[]> {
    return this.usersService.findServiceAccounts(actor);
  }

  findOne(
    id: string,
    actor: UserAdministrationActor,
  ): Promise<UserResponseDto> {
    return this.usersService.findServiceAccount(id, actor);
  }

  update(
    id: string,
    input: UpdateServiceAccountDto,
    actor: UserAdministrationActor,
  ): Promise<UserResponseDto> {
    return this.usersService.updateServiceAccountMetadata(id, input, actor);
  }

  async rotateCredentials(
    id: string,
    input: RotateServiceAccountCredentialsDto,
    actor: UserAdministrationActor,
    auditContext: PasswordChangeAuditContext = {},
  ): Promise<UserResponseDto> {
    await this.usersService.ensurePlatformAdmin(actor);
    return this.passwordUpdateService.rotateServiceAccountCredentials(
      id,
      input.newPassword,
      actor,
      auditContext,
    );
  }

  enable(id: string, actor: UserAdministrationActor): Promise<UserResponseDto> {
    return this.usersService.enableServiceAccount(id, actor);
  }

  disable(
    id: string,
    actor: UserAdministrationActor,
  ): Promise<UserResponseDto> {
    return this.usersService.disableServiceAccount(id, actor);
  }
}
