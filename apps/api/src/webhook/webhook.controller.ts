import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { CurrentUser, CurrentOrg } from '../auth/decorators/auth.decorator';
import { RequirePermission } from '../authz/decorators/permissions.decorator';
import { ProjectPermission } from '../authz/permissions';
import { ApiSuccessEnvelope, WebhookDto, WebhookDeliveryDto } from '@forgetrack/contracts';

@Controller()
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Get('projects/:projectId/webhooks')
  @RequirePermission(ProjectPermission.UPDATE)
  async listWebhooks(
    @Param('projectId') projectId: string,
  ): Promise<ApiSuccessEnvelope<WebhookDto[]>> {
    const data = await this.webhookService.listWebhooks(projectId);
    return { data };
  }

  @Post('projects/:projectId/webhooks')
  @RequirePermission(ProjectPermission.UPDATE)
  async createWebhook(
    @CurrentUser() user: any,
    @CurrentOrg() org: any,
    @Param('projectId') projectId: string,
    @Body('url') url: string,
    @Body('events') events: string[],
    @Body('secret') secret?: string,
  ): Promise<ApiSuccessEnvelope<WebhookDto>> {
    const data = await this.webhookService.createWebhook(org.id, projectId, user.id, url, events, secret);
    return { data };
  }

  @Get('webhooks/:id')
  @RequirePermission(ProjectPermission.UPDATE)
  async getWebhook(
    @Param('id') id: string,
  ): Promise<ApiSuccessEnvelope<WebhookDto>> {
    const data = await this.webhookService.getWebhook(id);
    return { data };
  }

  @Patch('webhooks/:id')
  @RequirePermission(ProjectPermission.UPDATE)
  async updateWebhook(
    @Param('id') id: string,
    @Body() body: any,
  ): Promise<ApiSuccessEnvelope<WebhookDto>> {
    const data = await this.webhookService.updateWebhook(id, body);
    return { data };
  }

  @Delete('webhooks/:id')
  @RequirePermission(ProjectPermission.UPDATE)
  async deleteWebhook(
    @Param('id') id: string,
  ): Promise<ApiSuccessEnvelope<{ success: boolean }>> {
    await this.webhookService.deleteWebhook(id);
    return { data: { success: true } };
  }

  @Post('webhooks/:id/test')
  @RequirePermission(ProjectPermission.UPDATE)
  async testWebhook(
    @Param('id') id: string,
  ): Promise<ApiSuccessEnvelope<WebhookDeliveryDto>> {
    const data = await this.webhookService.testWebhook(id);
    return { data };
  }

  @Get('webhooks/:id/deliveries')
  @RequirePermission(ProjectPermission.UPDATE)
  async listDeliveries(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ): Promise<ApiSuccessEnvelope<WebhookDeliveryDto[]>> {
    const data = await this.webhookService.listDeliveries(id, limit ? parseInt(limit, 10) : 50);
    return { data };
  }

  @Post('webhook-deliveries/:id/retry')
  @RequirePermission(ProjectPermission.UPDATE)
  async retryDelivery(
    @Param('id') id: string,
  ): Promise<ApiSuccessEnvelope<WebhookDeliveryDto>> {
    const data = await this.webhookService.retryDelivery(id);
    return { data };
  }
}
