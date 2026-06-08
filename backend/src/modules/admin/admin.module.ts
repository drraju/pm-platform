import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../authorization/authorization.module';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { Project } from '../projects/entities/project.entity';
import { Permission } from '../users/entities/permission.entity';
import { RolePermission } from '../users/entities/role-permission.entity';
import { Role } from '../users/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from './guards/admin.guard';

@Module({
  imports: [
    AuthorizationModule,
    TypeOrmModule.forFeature([
      User,
      Role,
      Permission,
      RolePermission,
      Project,
      ProjectMember,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],
})
export class AdminModule {}
