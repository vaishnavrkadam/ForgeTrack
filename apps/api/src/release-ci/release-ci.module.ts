import { Module } from '@nestjs/common';
import { ReleaseCiService } from './release-ci.service';
import { ReleaseCiController } from './release-ci.controller';

@Module({
  controllers: [ReleaseCiController],
  providers: [ReleaseCiService],
  exports: [ReleaseCiService],
})
export class ReleaseCiModule {}
