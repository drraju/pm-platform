import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '../projects/entities/project.entity';
import { Task } from '../tasks/entities/task.entity';
import { ResourceController } from './resource.controller';
import { ResourceAssignment } from './entities/resource-assignment.entity';
import { ResourceApiService } from './resource-api.service';
import { ResourceAssignmentValidationService } from './resource-assignment-validation.service';
import { Resource } from './entities/resource.entity';
import { ResourceValidationService } from './resource-validation.service';
import { ResourceService } from './resource.service';

@Module({
  imports: [TypeOrmModule.forFeature([Resource, ResourceAssignment, Project, Task])],
  controllers: [ResourceController],
  providers: [
    ResourceService,
    ResourceValidationService,
    ResourceAssignmentValidationService,
    ResourceApiService,
  ],
  exports: [
    ResourceService,
    ResourceValidationService,
    ResourceAssignmentValidationService,
  ],
})
export class ResourceModule {}
