import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { AutomationService } from './automation.service';
import { CurrentUser, CurrentOrg } from '../auth/decorators/auth.decorator';
import { RequirePermission } from '../authz/decorators/permissions.decorator';
import { ProjectPermission } from '../authz/permissions';
import { ApiSuccessEnvelope } from '@forgetrack/contracts';

@Controller()
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Post('projects/:projectId/automations')
  @RequirePermission(ProjectPermission.UPDATE)
  async createRule(
    @CurrentUser() user: any,
    @CurrentOrg() org: any,
    @Param('projectId') projectId: string,
    @Body('name') name: string,
    @Body('triggerType') triggerType: string,
    @Body('conditions') conditions: any[],
    @Body('actions') actions: any[],
    @Body('description') description?: string,
  ): Promise<ApiSuccessEnvelope<any>> {
    const data = await this.automationService.createRule(
      org.id,
      projectId,
      user.id,
      name,
      triggerType,
      conditions,
      actions,
      description,
    );
    return { data };
  }

  @Get('projects/:projectId/automations')
  @RequirePermission(ProjectPermission.UPDATE)
  async listRules(
    @Param('projectId') projectId: string,
  ): Promise<ApiSuccessEnvelope<any[]>> {
    const data = await this.automationService.listRules(projectId);
    return { data };
  }

  @Post('projects/:projectId/automations/:ruleId/toggle')
  @RequirePermission(ProjectPermission.UPDATE)
  async toggleRule(
    @Param('ruleId') ruleId: string,
    @Body('isEnabled') isEnabled: boolean,
  ): Promise<ApiSuccessEnvelope<any>> {
    const data = await this.automationService.toggleRule(ruleId, isEnabled);
    return { data };
  }

  @Get('projects/:projectId/automations/:ruleId')
  @RequirePermission(ProjectPermission.UPDATE)
  async getRule(
    @Param('ruleId') ruleId: string,
  ): Promise<ApiSuccessEnvelope<any>> {
    const data = await this.automationService.getRule(ruleId);
    return { data };
  }

  @Delete('projects/:projectId/automations/:ruleId')
  @RequirePermission(ProjectPermission.UPDATE)
  async deleteRule(
    @Param('ruleId') ruleId: string,
  ): Promise<ApiSuccessEnvelope<{ success: boolean }>> {
    await this.automationService.deleteRule(ruleId);
    return { data: { success: true } };
  }

  @Post('projects/:projectId/automations/dry-run')
  @RequirePermission(ProjectPermission.UPDATE)
  async dryRunRules(
    @Param('projectId') projectId: string,
    @Body('toStatusId') toStatusId: string,
  ): Promise<ApiSuccessEnvelope<any[]>> {
    const data = await this.automationService.dryRunRulesForTransition(projectId, toStatusId);
    return { data };
  }
}
