import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '../projects/entities/project.entity';
import { Task } from '../tasks/entities/task.entity';
import { ResourceAssignmentController } from './resource-assignment.controller';
import { ResourceAssignmentApiService } from './resource-assignment-api.service';
import { ResourceController } from './resource.controller';
import { ResourceAssignment } from './entities/resource-assignment.entity';
import { ResourceAssignmentService } from './resource-assignment.service';
import { ResourceApiService } from './resource-api.service';
import { ResourceAssignmentValidationService } from './resource-assignment-validation.service';
import { Resource } from './entities/resource.entity';
import { ResourceValidationService } from './resource-validation.service';
import { ResourceService } from './resource.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Resource, ResourceAssignment, Project, Task]),
  ],
  controllers: [ResourceController, ResourceAssignmentController],
  providers: [
    ResourceService,
    ResourceAssignmentService,
    ResourceValidationService,
    ResourceAssignmentValidationService,
    ResourceApiService,
    ResourceAssignmentApiService,
  ],
  exports: [
    ResourceService,
    ResourceAssignmentService,
    ResourceValidationService,
    ResourceAssignmentValidationService,
  ],
})
export class ResourceModule {}
