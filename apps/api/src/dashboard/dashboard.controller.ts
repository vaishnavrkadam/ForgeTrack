import { Controller, Get, Param } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { RequirePermission } from '../authz/decorators/permissions.decorator';
import { OrgPermission, ProjectPermission } from '../authz/permissions';
import { ApiSuccessEnvelope } from '@forgetrack/contracts';

@Controller()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('projects/:projectId/dashboard')
  @RequirePermission(ProjectPermission.READ)
  async getProjectDashboard(
    @Param('projectId') projectId: string,
  ): Promise<ApiSuccessEnvelope<any>> {
    const data = await this.dashboardService.getProjectDashboard(projectId);
    return { data };
  }

  @Get('organizations/:organizationId/dashboard')
  @RequirePermission(OrgPermission.READ)
  async getOrgDashboard(
    @Param('organizationId') orgId: string,
  ): Promise<ApiSuccessEnvelope<any>> {
    const data = await this.dashboardService.getOrganizationDashboard(orgId);
    return { data };
  }

  @Get('organizations/:organizationId/workload')
  @RequirePermission(OrgPermission.READ)
  async getUserWorkloads(
    @Param('organizationId') orgId: string,
  ): Promise<ApiSuccessEnvelope<any[]>> {
    const data = await this.dashboardService.getUserWorkloads(orgId);
    return { data };
  }

  @Get('projects/:projectId/dashboard/resolution-time')
  @RequirePermission(ProjectPermission.READ)
  async getResolutionTime(
    @Param('projectId') projectId: string,
  ): Promise<ApiSuccessEnvelope<any>> {
    const data = await this.dashboardService.getResolutionTime(projectId);
    return { data };
  }

  @Get('projects/:projectId/dashboard/trends')
  @RequirePermission(ProjectPermission.READ)
  async getIssueTrend(
    @Param('projectId') projectId: string,
  ): Promise<ApiSuccessEnvelope<any[]>> {
    const data = await this.dashboardService.getIssueTrend(projectId);
    return { data };
  }

  @Get('projects/:projectId/dashboard/release-progress')
  @RequirePermission(ProjectPermission.READ)
  async getReleaseProgress(
    @Param('projectId') projectId: string,
  ): Promise<ApiSuccessEnvelope<any[]>> {
    const data = await this.dashboardService.getReleaseProgress(projectId);
    return { data };
  }
}
