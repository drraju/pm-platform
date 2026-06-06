import { Module } from '@nestjs/common';
import { HealthCalculationService } from './health-calculation.service';

@Module({
  providers: [HealthCalculationService],
  exports: [HealthCalculationService],
})
export class HealthModule {}
