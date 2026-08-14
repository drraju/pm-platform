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
  controllers: [UsersController],
  providers: [UsersService, PasswordUpdateService],
  exports: [UsersService],
})
export class UsersModule {}
