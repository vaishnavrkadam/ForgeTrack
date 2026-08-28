import { Controller, Get } from '@nestjs/common';
import { HealthStatus, ApiSuccessEnvelope } from '@forgetrack/contracts';
import { Public } from './auth/decorators/auth.decorator';

@Controller('health')
export class AppController {
  private readonly startTime = Date.now();

  @Public()
  @Get()
  getHealth(): ApiSuccessEnvelope<HealthStatus> {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    return {
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptimeSeconds,
        services: {
          database: 'disconnected', // Seed status for Phase 1
          redis: 'disconnected',
        },
      },
    };
  }
}
