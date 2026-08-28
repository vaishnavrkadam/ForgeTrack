import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ReleaseCiService } from './release-ci.service';
import { CurrentOrg } from '../auth/decorators/auth.decorator';
import { RequirePermission } from '../authz/decorators/permissions.decorator';
import { ProjectPermission } from '../authz/permissions';
import { ApiSuccessEnvelope, CiRunDto, ReleaseHealthDto } from '@forgetrack/contracts';

@Controller()
export class ReleaseCiController {
  constructor(private readonly releaseCiService: ReleaseCiService) {}

  @Post('projects/:projectId/ci-runs')
  @RequirePermission(ProjectPermission.UPDATE)
  async recordCiRun(
    @CurrentOrg() org: any,
    @Param('projectId') projectId: string,
    @Body() body: any,
  ): Promise<ApiSuccessEnvelope<CiRunDto>> {
    const data = await this.releaseCiService.recordCiRun(org.id, projectId, body);
    return { data };
  }

  @Get('projects/:projectId/ci-runs')
  @RequirePermission(ProjectPermission.READ)
  async listCiRuns(
    @Param('projectId') projectId: string,
    @Query('limit') limit?: string,
  ): Promise<ApiSuccessEnvelope<CiRunDto[]>> {
    const data = await this.releaseCiService.listCiRuns(projectId, limit ? parseInt(limit, 10) : 50);
    return { data };
  }

  @Get('issues/:issueId/ci-runs')
  @RequirePermission(ProjectPermission.ISSUE_READ)
  async getIssueCiRuns(
    @Param('issueId') issueId: string,
  ): Promise<ApiSuccessEnvelope<CiRunDto[]>> {
    const data = await this.releaseCiService.getIssueCiRuns(issueId);
    return { data };
  }

  @Get('projects/:projectId/analytics/releases/:versionId')
  @RequirePermission(ProjectPermission.READ)
  async getReleaseHealth(
    @Param('projectId') projectId: string,
    @Param('versionId') versionId: string,
  ): Promise<ApiSuccessEnvelope<ReleaseHealthDto>> {
    const data = await this.releaseCiService.getReleaseHealth(projectId, versionId);
    return { data };
  }
}
