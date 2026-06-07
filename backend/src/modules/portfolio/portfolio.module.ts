import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthModule } from '../health/health.module';
import { Project } from '../projects/entities/project.entity';
import { Issue } from '../raid/entities/issue.entity';
import { Risk } from '../raid/entities/risk.entity';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';

@Module({
  imports: [HealthModule, TypeOrmModule.forFeature([Project, Risk, Issue])],
  controllers: [PortfolioController],
  providers: [PortfolioService],
})
export class PortfolioModule {}
