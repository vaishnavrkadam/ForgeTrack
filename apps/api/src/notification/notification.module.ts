import { Module, Global, OnModuleInit, forwardRef } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { AiModule } from '../ai/ai.module';

@Global()
@Module({
  imports: [forwardRef(() => AiModule)],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule implements OnModuleInit {
  constructor(private readonly notificationService: NotificationService) {}

  onModuleInit() {
    // Poll transactional outbox events every 10 seconds in the background
    setInterval(async () => {
      try {
        await this.notificationService.processOutboxEvents();
      } catch (err) {
        console.error('Error processing outbox events:', err);
      }
    }, 10000);
  }
}
