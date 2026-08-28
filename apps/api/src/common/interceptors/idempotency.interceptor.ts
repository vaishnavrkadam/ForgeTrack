import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '../cache.service';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly cacheService: CacheService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const idempotencyKey = request.headers['idempotency-key'] || request.headers['Idempotency-Key'];

    // Only apply idempotency to mutating HTTP methods when key is provided
    if (!idempotencyKey || !['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)) {
      return next.handle();
    }

    const cacheKey = `idempotency:${idempotencyKey}`;
    const cachedResponse = this.cacheService.get<any>(cacheKey);

    if (cachedResponse) {
      response.setHeader('X-Idempotent-Replay', 'true');
      return of(cachedResponse);
    }

    return next.handle().pipe(
      tap(data => {
        // Cache response for 5 minutes
        if (data !== undefined) {
          this.cacheService.set(cacheKey, data, 300);
        }
      }),
    );
  }
}
