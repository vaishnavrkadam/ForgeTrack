import { Controller, Get, Post, Param, Body, BadRequestException } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CurrentUser, CurrentOrg } from '../auth/decorators/auth.decorator';
import { RequirePermission } from '../authz/decorators/permissions.decorator';
import { ProjectPermission } from '../authz/permissions';
import { ApiSuccessEnvelope } from '@forgetrack/contracts';

@Controller()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('notifications')
  async listNotifications(
    @CurrentUser() user: any,
  ): Promise<ApiSuccessEnvelope<any[]>> {
    const data = await this.notificationService.listNotifications(user.id);
    return { data };
  }

  @Post('notifications/:notificationId/read')
  async markAsRead(
    @CurrentUser() user: any,
    @Param('notificationId') notificationId: string,
  ): Promise<ApiSuccessEnvelope<{ success: boolean }>> {
    await this.notificationService.markAsRead(notificationId, user.id);
    return { data: { success: true } };
  }

  @Get('notifications/preferences')
  async getPreferences(
    @CurrentUser() user: any,
    @CurrentOrg() org: any,
  ): Promise<ApiSuccessEnvelope<any[]>> {
    if (!org) throw new BadRequestException('Organization context required');
    const data = await this.notificationService.getPreferences(org.id, user.id);
    return { data };
  }

  @Post('notifications/preferences')
  async upsertPreference(
    @CurrentUser() user: any,
    @CurrentOrg() org: any,
    @Body('eventType') eventType: string,
    @Body('inApp') inApp: boolean,
    @Body('email') email: boolean,
  ): Promise<ApiSuccessEnvelope<any>> {
    if (!org) throw new BadRequestException('Organization context required');
    if (!eventType) throw new BadRequestException('eventType is required');
    const data = await this.notificationService.upsertPreference(org.id, user.id, eventType, inApp ?? true, email ?? true);
    return { data };
  }

  @Post('projects/:projectId/webhooks')
  @RequirePermission(ProjectPermission.UPDATE)
  async registerWebhook(
    @CurrentOrg() org: any,
    @Param('projectId') projectId: string,
    @Body('url') url: string,
    @Body('secret') secret?: string,
  ): Promise<ApiSuccessEnvelope<any>> {
    if (!url) throw new BadRequestException('Webhook URL is required');
    const data = await this.notificationService.registerWebhook(projectId, org.id, url, secret);
    return { data };
  }

  @Get('projects/:projectId/webhooks')
  @RequirePermission(ProjectPermission.UPDATE)
  async listWebhooks(
    @Param('projectId') projectId: string,
  ): Promise<ApiSuccessEnvelope<any[]>> {
    const data = await this.notificationService.listWebhooks(projectId);
    return { data };
  }
}
