import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { MigrationRunnerService } from '../migration-runner.service';

describe('MigrationRunnerService', () => {
  let service: MigrationRunnerService;
  let dataSource: {
    query: jest.Mock;
    transaction: jest.Mock;
  };

  beforeEach(() => {
    dataSource = {
      query: jest.fn(),
      transaction: jest.fn(),
    };
    service = new MigrationRunnerService(dataSource as never);
  });

  it('applies only pending migrations in filename order', async () => {
    const migrationDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), 'pm-platform-migrations-'),
    );
    await fs.writeFile(
      path.join(migrationDirectory, '001_first.sql'),
      'SELECT 1;',
      'utf8',
    );
    await fs.writeFile(
      path.join(migrationDirectory, '002_second.sql'),
      'SELECT 2;',
      'utf8',
    );

    jest
      .spyOn(service as never, 'resolveMigrationDirectory')
      .mockReturnValue(migrationDirectory);
    dataSource.query
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([{ filename: '001_first.sql' }]);
    dataSource.transaction.mockImplementation(async (callback) => {
      await callback({
        query: jest.fn(),
      });
    });

    await service.runPendingMigrations();

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });
});
