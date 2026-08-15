import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectMember } from '../../modules/projects/entities/project-member.entity';
import { Project } from '../../modules/projects/entities/project.entity';
import { Task } from '../../modules/tasks/entities/task.entity';
import { Role } from '../../modules/users/entities/role.entity';
import { AuthorizationPolicyService } from './authorization-policy.service';
import { CanonicalCapabilityResolverService } from './canonical-capability-resolver.service';
import { PermissionsGuard } from './permissions.guard';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Project, ProjectMember, Task, Role])],
  providers: [
    AuthorizationPolicyService,
    CanonicalCapabilityResolverService,
    PermissionsGuard,
  ],
  exports: [
    AuthorizationPolicyService,
    CanonicalCapabilityResolverService,
    PermissionsGuard,
  ],
})
export class AuthzModule {}
