import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectMember } from '../../projects/entities/project-member.entity';
import { Project } from '../../projects/entities/project.entity';
import { SlackController } from './slack.controller';
import { SlackService } from './slack.service';

@Module({
  imports: [TypeOrmModule.forFeature([Project, ProjectMember])],
  controllers: [SlackController],
  providers: [SlackService],
  exports: [SlackService],
})
export class SlackModule {}
