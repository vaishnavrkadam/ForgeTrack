import { Module, OnModuleInit } from '@nestjs/common';
import { AutomationService } from './automation.service';
import { AutomationController } from './automation.controller';

@Module({
  controllers: [AutomationController],
  providers: [AutomationService],
  exports: [AutomationService],
})
export class AutomationModule implements OnModuleInit {
  constructor(private readonly automationService: AutomationService) {}

  onModuleInit() {
    // Retry failed automation executions every 60 seconds
    setInterval(() => {
      this.automationService.retryFailedExecutions().catch((err: any) => {
        console.error('[AutomationEngine] Retry daemon error:', err?.message);
      });
    }, 60000);
  }
}
