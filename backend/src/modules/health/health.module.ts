import { Module } from '@nestjs/common';
import { ProjectHealthService } from './project-health.service';

@Module({
  providers: [ProjectHealthService],
  exports: [ProjectHealthService],
})
export class HealthModule {}
