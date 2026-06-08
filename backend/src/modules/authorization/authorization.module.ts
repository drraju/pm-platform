import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { Project } from '../projects/entities/project.entity';
import { Role } from '../users/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { AuthorizationService } from './authorization.service';
import { PermissionsGuard } from './guards/permissions.guard';
import { ProjectAccessGuard } from './guards/project-access.guard';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Project, ProjectMember])],
  providers: [AuthorizationService, PermissionsGuard, ProjectAccessGuard],
  exports: [AuthorizationService, PermissionsGuard, ProjectAccessGuard],
})
export class AuthorizationModule {}
