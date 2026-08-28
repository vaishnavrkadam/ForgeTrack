import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class RateLimiterGuard implements CanActivate {
  private readonly clients = new Map<string, number[]>();
  private readonly LIMIT = 150; // Max requests allowed per window
  private readonly WINDOW_MS = 60000; // 1 minute sliding window

  canActivate(context: ExecutionContext): boolean {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const response = httpContext.getResponse();
    const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown-ip';

    const now = Date.now();
    let timestamps = this.clients.get(ip) || [];

    // Filter out timestamps older than the sliding window limit
    timestamps = timestamps.filter(time => now - time < this.WINDOW_MS);

    const remaining = Math.max(0, this.LIMIT - timestamps.length - 1);
    const resetTime = Math.ceil((now + this.WINDOW_MS) / 1000);

    if (response && response.setHeader) {
      response.setHeader('X-RateLimit-Limit', this.LIMIT.toString());
      response.setHeader('X-RateLimit-Remaining', remaining.toString());
      response.setHeader('X-RateLimit-Reset', resetTime.toString());
    }

    if (timestamps.length >= this.LIMIT) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests. Rate limit exceeded. Please try again later.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    timestamps.push(now);
    this.clients.set(ip, timestamps);
    return true;
  }
}
