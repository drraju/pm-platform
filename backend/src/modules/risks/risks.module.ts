import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsModule } from '../projects/projects.module';
import { Risk } from '../raid/entities/risk.entity';
import { RisksController } from './risks.controller';
import { RisksService } from './risks.service';

@Module({
  imports: [TypeOrmModule.forFeature([Risk]), ProjectsModule],
  controllers: [RisksController],
  providers: [RisksService],
  exports: [RisksService],
})
export class RisksModule {}
