import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const corsOriginEnv = process.env.CORS_ORIGIN;
  const allowedOrigins = corsOriginEnv
    ? corsOriginEnv.split(',').map((origin) => origin.trim())
    : true;

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins === true || allowedOrigins.includes('*')) {
        return callback(null, origin); // Reflect incoming origin to support credentials: true
      }
      if (Array.isArray(allowedOrigins)) {
        const normalized = origin.replace(/\/$/, '');
        const match = allowedOrigins.some((o) => o.replace(/\/$/, '') === normalized || o === '*');
        if (match) {
          return callback(null, origin);
        }
      }
      return callback(null, origin); // Permissive in deployment with credentials
    },
    credentials: true, // Allow cookies to be shared with frontend client
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'X-Requested-With', 'Cookie', 'Origin'],
  });

  const port = process.env.PORT || 3001;
  // Bind to 0.0.0.0 so cloud container environments (e.g. Render, Railway, Docker) can route external requests
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://0.0.0.0:${port}/api/v1`);
}
bootstrap();
