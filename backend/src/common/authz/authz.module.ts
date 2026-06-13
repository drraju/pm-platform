import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectMember } from '../../modules/projects/entities/project-member.entity';
import { Project } from '../../modules/projects/entities/project.entity';
import { Task } from '../../modules/tasks/entities/task.entity';
import { Role } from '../../modules/users/entities/role.entity';
import { AuthorizationPolicyService } from './authorization-policy.service';
import { PermissionsGuard } from './permissions.guard';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Project, ProjectMember, Task, Role])],
  providers: [AuthorizationPolicyService, PermissionsGuard],
  exports: [AuthorizationPolicyService, PermissionsGuard],
})
export class AuthzModule {}
