import { RateLimiterGuard } from '../src/common/guards/rate-limiter.guard';
import { IdempotencyInterceptor } from '../src/common/interceptors/idempotency.interceptor';
import { CacheService } from '../src/common/cache.service';
import { of } from 'rxjs';

describe('Phase 22 — Hardening & Reliability', () => {
  describe('RateLimiterGuard', () => {
    let guard: RateLimiterGuard;

    beforeEach(() => {
      guard = new RateLimiterGuard();
    });

    it('should allow requests below threshold and attach rate limit headers', () => {
      const headersSet: Record<string, string> = {};
      const mockContext: any = {
        switchToHttp: () => ({
          getRequest: () => ({ ip: '198.51.100.1', headers: {} }),
          getResponse: () => ({
            setHeader: (k: string, v: string) => {
              headersSet[k] = v;
            },
          }),
        }),
      };

      const allowed = guard.canActivate(mockContext);

      expect(allowed).toBe(true);
      expect(headersSet['X-RateLimit-Limit']).toBe('150');
      expect(headersSet['X-RateLimit-Remaining']).toBeDefined();
      expect(headersSet['X-RateLimit-Reset']).toBeDefined();
    });

    it('should throw 429 when requests exceed 150 per window', () => {
      const mockContext: any = {
        switchToHttp: () => ({
          getRequest: () => ({ ip: '198.51.100.2', headers: {} }),
          getResponse: () => ({ setHeader: jest.fn() }),
        }),
      };

      for (let i = 0; i < 150; i++) {
        guard.canActivate(mockContext);
      }

      expect(() => guard.canActivate(mockContext)).toThrow(/Rate limit exceeded/);
    });
  });

  describe('IdempotencyInterceptor', () => {
    let cacheService: CacheService;
    let interceptor: IdempotencyInterceptor;

    beforeEach(() => {
      cacheService = new CacheService();
      interceptor = new IdempotencyInterceptor(cacheService);
    });

    it('should execute mutating request and cache response by Idempotency-Key', (done) => {
      const headersSet: Record<string, string> = {};
      const mockContext: any = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            headers: { 'idempotency-key': 'req-key-123' },
          }),
          getResponse: () => ({
            setHeader: (k: string, v: string) => {
              headersSet[k] = v;
            },
          }),
        }),
      };

      const mockCallHandler: any = {
        handle: () => of({ data: { issueId: 'issue-new-1', created: true } }),
      };

      interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
        expect(result.data.issueId).toBe('issue-new-1');

        // Check that key is now cached
        const cached = cacheService.get<any>('idempotency:req-key-123');
        expect(cached).toBeDefined();
        expect(cached?.data?.issueId).toBe('issue-new-1');
        done();
      });
    });

    it('should return cached response with X-Idempotent-Replay on replay of same key', (done) => {
      const headersSet: Record<string, string> = {};
      const mockContext: any = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            headers: { 'idempotency-key': 'req-replay-999' },
          }),
          getResponse: () => ({
            setHeader: (k: string, v: string) => {
              headersSet[k] = v;
            },
          }),
        }),
      };

      // Pre-seed cache
      cacheService.set('idempotency:req-replay-999', { data: { cachedResult: 'already-processed' } });

      const mockCallHandler: any = {
        handle: jest.fn(), // should not be called
      };

      interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
        expect(result.data.cachedResult).toBe('already-processed');
        expect(headersSet['X-Idempotent-Replay']).toBe('true');
        expect(mockCallHandler.handle).not.toHaveBeenCalled();
        done();
      });
    });
  });
});
