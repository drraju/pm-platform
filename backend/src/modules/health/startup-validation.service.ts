import { Injectable, Logger } from '@nestjs/common';
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
  ) {}

  async prepareApplication() {
    this.validateEnvironment();
    await this.migrationRunnerService.runPendingMigrations();
    await this.operationalHealthService.ensureReady();
    this.logger.log('Startup validation completed successfully');
  }

  private validateEnvironment() {
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
