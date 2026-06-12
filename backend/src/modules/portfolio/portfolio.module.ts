import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthModule } from '../health/health.module';
import { Project } from '../projects/entities/project.entity';
import { Issue } from '../raid/entities/issue.entity';
import { Risk } from '../raid/entities/risk.entity';
import { Task } from '../tasks/entities/task.entity';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';

@Module({
  imports: [
    HealthModule,
    TypeOrmModule.forFeature([Project, Risk, Issue, Task]),
  ],
  controllers: [PortfolioController],
  providers: [PortfolioService],
})
export class PortfolioModule {}
