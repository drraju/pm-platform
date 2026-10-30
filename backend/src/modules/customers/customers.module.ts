import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '../projects/entities/project.entity';
import { ProjectsModule } from '../projects/projects.module';
import { Task } from '../tasks/entities/task.entity';
import { TasksModule } from '../tasks/tasks.module';
import { User } from '../users/entities/user.entity';
import { CustomerCommitmentsController, ProjectCommitmentsController } from './commitments.controller';
import { CommitmentsService } from './commitments.service';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CustomerCommitment } from './entities/customer-commitment.entity';
import { Customer } from './entities/customer.entity';

@Module({
  controllers: [CustomersController, CustomerCommitmentsController, ProjectCommitmentsController],
  imports: [
    ProjectsModule,
    TasksModule,
    TypeOrmModule.forFeature([Customer, CustomerCommitment, User, Project, Task]),
  ],
  providers: [CustomersService, CommitmentsService],
  exports: [CustomersService],
})
export class CustomersModule {}
