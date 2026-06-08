import { DataSource } from 'typeorm';
import { createDataSourceOptions } from '../src/database/typeorm.config';

const appDataSource = new DataSource(createDataSourceOptions());

async function runMigrations() {
  await appDataSource.initialize();

  try {
    const migrations = await appDataSource.runMigrations({
      transaction: 'all',
    });

    if (migrations.length === 0) {
      console.log('No pending migrations.');
      return;
    }

    console.log(
      `Executed migrations: ${migrations
        .map((migration) => migration.name)
        .join(', ')}`,
    );
  } finally {
    await appDataSource.destroy();
  }
}

runMigrations().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
