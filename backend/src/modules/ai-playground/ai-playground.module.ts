import { Module } from '@nestjs/common';
import { AiModule } from '../../ai';
import { AiPlaygroundController } from './ai-playground.controller';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [AiModule, ProjectsModule],
  controllers: [AiPlaygroundController],
})
export class AiPlaygroundModule {}
