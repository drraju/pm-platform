import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersModule } from '../customers/customers.module';
import { Project } from '../projects/entities/project.entity';
import { ProjectsModule } from '../projects/projects.module';
import { Task } from '../tasks/entities/task.entity';
import { User } from '../users/entities/user.entity';
import { Program } from './entities/program.entity';
import { ProjectRequest } from './entities/project-request.entity';
import {
  ProgramsController,
  ProjectRequestsController,
  SearchController,
} from './programs.controller';
import { ProgramsService } from './programs.service';
import { SearchService } from './search.service';

@Module({
  controllers: [ProgramsController, ProjectRequestsController, SearchController],
  imports: [
    CustomersModule,
    ProjectsModule,
    TypeOrmModule.forFeature([Program, ProjectRequest, Project, Task, User]),
  ],
  providers: [ProgramsService, SearchService],
})
export class ProgramsModule {}
