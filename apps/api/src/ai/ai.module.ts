import { Module, forwardRef } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { IssueModule } from '../issue/issue.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [forwardRef(() => IssueModule), CommonModule],
  controllers: [AiController],
  providers: [EmbeddingService, AiService],
  exports: [EmbeddingService, AiService],
})
export class AiModule {}
