import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs('database', (): TypeOrmModuleOptions => {
  const isProduction = process.env.NODE_ENV === 'production';
  const dbUrl = process.env.DATABASE_URL;

  const baseConfig: TypeOrmModuleOptions = {
    type: 'postgres',
    entities: [],
    migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
    migrationsRun: process.env.DB_MIGRATIONS_RUN === 'true' || true,
    synchronize: false,
    logging: process.env.DB_LOGGING === 'true',
    retryAttempts: 3,
    retryDelay: 3000,
    ssl: (isProduction || !!dbUrl || process.env.DB_SSL === 'true')
      ? { rejectUnauthorized: false }
      : false,
  };

  if (dbUrl) {
    return {
      ...baseConfig,
      url: dbUrl,
    };
  }

  return {
    ...baseConfig,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_DATABASE || 'forgetrack',
  };
});
