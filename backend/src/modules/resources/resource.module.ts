import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '../projects/entities/project.entity';
import { Task } from '../tasks/entities/task.entity';
import { ResourceAssignmentController } from './resource-assignment.controller';
import { ResourceAssignmentApiService } from './resource-assignment-api.service';
import { ResourceAvailabilityOverrideApiService } from './resource-availability-override-api.service';
import { ResourceAvailabilityOverrideController } from './resource-availability-override.controller';
import { ResourceAvailabilityOverrideService } from './resource-availability-override.service';
import { ResourceAvailabilityOverrideValidationService } from './resource-availability-override-validation.service';
import { ResourceCapacityPolicyApiService } from './resource-capacity-policy-api.service';
import { ResourceCapacityPolicyController } from './resource-capacity-policy.controller';
import { ResourceCapacityPolicyService } from './resource-capacity-policy.service';
import { ResourceCapacityPolicyValidationService } from './resource-capacity-policy-validation.service';
import { ResourceSkillApiService } from './resource-skill-api.service';
import { ResourceSkillController } from './resource-skill.controller';
import { ResourceController } from './resource.controller';
import { ResourceAssignment } from './entities/resource-assignment.entity';
import { ResourceAvailabilityOverride } from './entities/resource-availability-override.entity';
import { ResourceCapacityPolicy } from './entities/resource-capacity-policy.entity';
import { ResourceSkill } from './entities/resource-skill.entity';
import { ResourceAssignmentService } from './resource-assignment.service';
import { ResourceApiService } from './resource-api.service';
import { ResourceAssignmentValidationService } from './resource-assignment-validation.service';
import { ResourceSkillService } from './resource-skill.service';
import { ResourceSkillValidationService } from './resource-skill-validation.service';
import { Resource } from './entities/resource.entity';
import { Skill } from './entities/skill.entity';
import { ResourceValidationService } from './resource-validation.service';
import { ResourceService } from './resource.service';
import { SkillApiService } from './skill-api.service';
import { SkillController } from './skill.controller';
import { SkillService } from './skill.service';
import { SkillValidationService } from './skill-validation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Resource,
      Skill,
      ResourceSkill,
      ResourceAssignment,
      ResourceCapacityPolicy,
      ResourceAvailabilityOverride,
      Project,
      Task,
    ]),
  ],
  controllers: [
    ResourceController,
    ResourceAssignmentController,
    ResourceCapacityPolicyController,
    ResourceAvailabilityOverrideController,
    SkillController,
    ResourceSkillController,
  ],
  providers: [
    ResourceService,
    SkillService,
    ResourceSkillService,
    ResourceAssignmentService,
    ResourceCapacityPolicyService,
    ResourceAvailabilityOverrideService,
    ResourceValidationService,
    ResourceAssignmentValidationService,
    ResourceCapacityPolicyValidationService,
    ResourceAvailabilityOverrideValidationService,
    SkillValidationService,
    ResourceSkillValidationService,
    ResourceApiService,
    ResourceAssignmentApiService,
    ResourceCapacityPolicyApiService,
    ResourceAvailabilityOverrideApiService,
    SkillApiService,
    ResourceSkillApiService,
  ],
  exports: [
    ResourceService,
    SkillService,
    ResourceSkillService,
    ResourceAssignmentService,
    ResourceCapacityPolicyService,
    ResourceAvailabilityOverrideService,
    ResourceValidationService,
    ResourceAssignmentValidationService,
    ResourceCapacityPolicyValidationService,
    ResourceAvailabilityOverrideValidationService,
    SkillValidationService,
    ResourceSkillValidationService,
    SkillApiService,
    ResourceSkillApiService,
  ],
})
export class ResourceModule {}
