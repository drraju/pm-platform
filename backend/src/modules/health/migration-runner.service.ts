import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

type AppliedMigration = {
  applied_at: string;
  filename: string;
};

@Injectable()
export class MigrationRunnerService {
  private readonly logger = new Logger(MigrationRunnerService.name);

  constructor(private readonly dataSource: DataSource) {}

  async runPendingMigrations() {
    const migrationDirectory = this.resolveMigrationDirectory();
    await this.ensureMigrationTable();

    const migrationFiles = (await fs.readdir(migrationDirectory))
      .filter((filename) => filename.endsWith('.sql'))
      .sort();

    const appliedMigrations = await this.dataSource.query<AppliedMigration[]>(
      'SELECT filename, applied_at FROM schema_migrations ORDER BY filename ASC',
    );
    const appliedFileNames = new Set(
      appliedMigrations.map((migration) => migration.filename),
    );

    this.logger.log(
      `Migration status: ${appliedMigrations.length}/${migrationFiles.length} applied`,
    );

    for (const filename of migrationFiles) {
      if (appliedFileNames.has(filename)) {
        this.logger.log(`Migration already applied: ${filename}`);
        continue;
      }

      const sql = await fs.readFile(path.join(migrationDirectory, filename), 'utf8');
      this.logger.log(`Applying migration: ${filename}`);

      await this.dataSource.transaction(async (transactionalEntityManager) => {
        await transactionalEntityManager.query(sql);
        await transactionalEntityManager.query(
          `INSERT INTO schema_migrations (filename) VALUES ($1)`,
          [filename],
        );
      });

      this.logger.log(`Migration applied successfully: ${filename}`);
    }
  }

  private async ensureMigrationTable() {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  }

  private resolveMigrationDirectory() {
    const candidates = [
      path.resolve(process.cwd(), 'src/database/migrations'),
      path.resolve(process.cwd(), 'dist/src/database/migrations'),
    ];

    for (const candidate of candidates) {
      try {
        const stat = fsSync.statSync(candidate);
        if (stat.isDirectory()) {
          return candidate;
        }
      } catch {
        continue;
      }
    }

    throw new Error('Unable to locate the SQL migrations directory');
  }
}
