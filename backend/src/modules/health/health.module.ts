import { Module } from '@nestjs/common';
import { AppService } from '../../app.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { HealthController } from './health.controller';
import { MigrationRunnerService } from './migration-runner.service';
import { OperationalHealthService } from './operational-health.service';
import { ProjectHealthService } from './project-health.service';
import { StartupValidationService } from './startup-validation.service';

@Module({
  imports: [NotificationsModule],
  controllers: [HealthController],
  providers: [
    AppService,
    ProjectHealthService,
    OperationalHealthService,
    MigrationRunnerService,
    StartupValidationService,
  ],
  exports: [
    ProjectHealthService,
    StartupValidationService,
    OperationalHealthService,
  ],
})
export class HealthModule {}
