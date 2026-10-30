import { Injectable, Logger, Optional } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { assertBreakGlassPasswordPolicy } from './break-glass-password.policy';
import { MigrationRunnerService } from './migration-runner.service';
import { OperationalHealthService } from './operational-health.service';

const requiredEnvironmentVariables = [
  'POSTGRES_HOST',
  'POSTGRES_PORT',
  'POSTGRES_DB',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'REDIS_HOST',
  'REDIS_PORT',
];

@Injectable()
export class StartupValidationService {
  private readonly logger = new Logger(StartupValidationService.name);

  constructor(
    private readonly migrationRunnerService: MigrationRunnerService,
    private readonly operationalHealthService: OperationalHealthService,
    @Optional()
    private readonly notificationsService?: NotificationsService,
  ) {}

  async prepareApplication() {
    this.validateEnvironment();
    await this.migrationRunnerService.runPendingMigrations();
    await this.operationalHealthService.ensureReady();
    try {
      await this.notificationsService?.sweepOverdue();
    } catch (error) {
      this.logger.warn(
        error instanceof Error ? error.message : 'Overdue alerts were not recorded',
      );
    }
    this.logger.log('Startup validation completed successfully');
  }

  private validateEnvironment() {
    assertBreakGlassPasswordPolicy();
    const missingVariables = requiredEnvironmentVariables.filter(
      (variableName) => !process.env[variableName],
    );

    if (missingVariables.length === 0) {
      return;
    }

    throw new Error(
      `Missing required environment variables: ${missingVariables.join(', ')}`,
    );
  }
}
