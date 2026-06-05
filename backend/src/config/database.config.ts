export const databaseConfig = () => ({
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  database: process.env.POSTGRES_DB ?? 'pm_platform',
  username: process.env.POSTGRES_USER ?? 'postgres',
});
