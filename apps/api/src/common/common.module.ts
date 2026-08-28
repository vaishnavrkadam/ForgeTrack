import { Module, Global } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { CacheService } from './cache.service';
import { RateLimiterGuard } from './guards/rate-limiter.guard';
import { IdempotencyInterceptor } from './interceptors/idempotency.interceptor';

@Global()
@Module({
  providers: [
    CacheService,
    IdempotencyInterceptor,
    {
      provide: APP_GUARD,
      useClass: RateLimiterGuard,
    },
  ],
  exports: [CacheService, IdempotencyInterceptor],
})
export class CommonModule {}
