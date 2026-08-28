import { Module } from '@nestjs/common';
import { IssueService } from './issue.service';
import { WorkflowService } from './workflow.service';
import { IssueController } from './issue.controller';
import { AutomationModule } from '../automation/automation.module';

@Module({
  imports: [AutomationModule],
  controllers: [IssueController],
  providers: [IssueService, WorkflowService],
  exports: [IssueService, WorkflowService],
})
export class IssueModule {}
