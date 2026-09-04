import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PasswordModule } from '../auth/password.module';
import { PasswordUpdateService } from '../auth/password-update.service';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { RolePermission } from './entities/role-permission.entity';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { ServiceAccountAdministrationService } from './service-account-administration.service';
import { ServiceAccountsController } from './service-accounts.controller';
import { ExternalIdentity } from './entities/external-identity.entity';
import { ExternalIdentitiesService } from './external-identities.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      ExternalIdentity,
      Role,
      Permission,
      RolePermission,
      ProjectMember,
    ]),
    PasswordModule,
  ],
  controllers: [ServiceAccountsController, UsersController],
  providers: [
    UsersService,
    PasswordUpdateService,
    ServiceAccountAdministrationService,
    ExternalIdentitiesService,
  ],
  exports: [ExternalIdentitiesService, UsersService],
})
export class UsersModule {}
