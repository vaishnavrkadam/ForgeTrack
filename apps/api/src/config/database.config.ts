import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs('database', (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'forgetrack',
  entities: [],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  migrationsRun: process.env.DB_MIGRATIONS_RUN === 'true' || true,
  synchronize: false, // Always disable synchronize in production/development for migration safety
  logging: process.env.DB_LOGGING === 'true',
  retryAttempts: 3,
  retryDelay: 3000,
}));
