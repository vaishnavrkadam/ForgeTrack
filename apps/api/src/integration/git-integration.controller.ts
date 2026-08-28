import { Controller, Get, Post, Patch, Delete, Body, Param, Headers } from '@nestjs/common';
import { GitIntegrationService } from './git-integration.service';
import { CurrentUser } from '../auth/decorators/auth.decorator';
import { RequirePermission } from '../authz/decorators/permissions.decorator';
import { OrgPermission, ProjectPermission } from '../authz/permissions';
import { ApiSuccessEnvelope } from '@forgetrack/contracts';

@Controller()
export class GitIntegrationController {
  constructor(private readonly gitIntegrationService: GitIntegrationService) {}

  @Get('organizations/:organizationId/integrations')
  @RequirePermission(OrgPermission.READ)
  async listIntegrations(
    @Param('organizationId') orgId: string,
  ): Promise<ApiSuccessEnvelope<any[]>> {
    const data = await this.gitIntegrationService.listIntegrations(orgId);
    return { data };
  }

  @Post('organizations/:organizationId/integrations')
  @RequirePermission(OrgPermission.UPDATE)
  async createIntegration(
    @CurrentUser() user: any,
    @Param('organizationId') orgId: string,
    @Body('provider') provider: string,
    @Body('configuration') configuration: Record<string, any>,
    @Body('projectId') projectId?: string,
    @Body('secretReference') secretReference?: string,
  ): Promise<ApiSuccessEnvelope<any>> {
    const data = await this.gitIntegrationService.createIntegration(
      orgId,
      projectId || null,
      user.id,
      provider,
      configuration || {},
      secretReference,
    );
    return { data };
  }

  @Get('integrations/:id')
  @RequirePermission(OrgPermission.READ)
  async getIntegration(
    @Param('id') integrationId: string,
  ): Promise<ApiSuccessEnvelope<any>> {
    const data = await this.gitIntegrationService.getIntegration(integrationId);
    return { data };
  }

  @Patch('integrations/:id')
  @RequirePermission(OrgPermission.UPDATE)
  async updateIntegration(
    @Param('id') integrationId: string,
    @Body() body: any,
  ): Promise<ApiSuccessEnvelope<any>> {
    const data = await this.gitIntegrationService.updateIntegration(integrationId, body);
    return { data };
  }

  @Delete('integrations/:id')
  @RequirePermission(OrgPermission.UPDATE)
  async deleteIntegration(
    @Param('id') integrationId: string,
  ): Promise<ApiSuccessEnvelope<{ success: boolean }>> {
    await this.gitIntegrationService.deleteIntegration(integrationId);
    return { data: { success: true } };
  }

  @Post('integrations/:id/test')
  @RequirePermission(OrgPermission.UPDATE)
  async testIntegration(
    @Param('id') integrationId: string,
  ): Promise<ApiSuccessEnvelope<any>> {
    const data = await this.gitIntegrationService.testIntegration(integrationId);
    return { data };
  }

  @Get('integrations/:id/repositories')
  @RequirePermission(OrgPermission.READ)
  async listRepositories(
    @Param('id') integrationId: string,
  ): Promise<ApiSuccessEnvelope<any[]>> {
    const data = await this.gitIntegrationService.listRepositories(integrationId);
    return { data };
  }

  @Post('integrations/:id/repositories/sync')
  @RequirePermission(OrgPermission.UPDATE)
  async syncRepositories(
    @Param('id') integrationId: string,
  ): Promise<ApiSuccessEnvelope<any[]>> {
    const data = await this.gitIntegrationService.syncRepositories(integrationId);
    return { data };
  }

  /**
   * Inbound Webhook endpoint from GitHub / GitLab / Git provider
   */
  @Post('integrations/:id/webhook')
  async handleWebhook(
    @Param('id') integrationId: string,
    @Headers() headers: Record<string, any>,
    @Body() payload: any,
  ): Promise<ApiSuccessEnvelope<any>> {
    const data = await this.gitIntegrationService.handleWebhook(integrationId, headers, payload);
    return { data };
  }

  /**
   * Code links for an issue
   */
  @Get('issues/:issueId/code-links')
  @RequirePermission(ProjectPermission.ISSUE_READ)
  async getIssueCodeLinks(
    @Param('issueId') issueId: string,
  ): Promise<ApiSuccessEnvelope<any[]>> {
    const data = await this.gitIntegrationService.getCodeLinks(issueId);
    return { data };
  }
}
