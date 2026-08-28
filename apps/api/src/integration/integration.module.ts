import { Module, forwardRef } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { IntegrationController } from './integration.controller';
import { GitIntegrationService } from './git-integration.service';
import { GitIntegrationController } from './git-integration.controller';
import { GitHubProvider } from './providers/github.provider';
import { GitLabProvider } from './providers/gitlab.provider';
import { IssueModule } from '../issue/issue.module';

@Module({
  imports: [forwardRef(() => IssueModule)],
  controllers: [IntegrationController, GitIntegrationController],
  providers: [
    IntegrationService,
    GitIntegrationService,
    GitHubProvider,
    GitLabProvider,
  ],
  exports: [IntegrationService, GitIntegrationService],
})
export class IntegrationModule {}
