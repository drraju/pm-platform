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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
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
  ],
  exports: [UsersService],
})
export class UsersModule {}
