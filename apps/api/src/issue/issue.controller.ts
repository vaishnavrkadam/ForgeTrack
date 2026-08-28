import { Controller, Get, Post, Patch, Delete, Param, Body, ParseIntPipe } from '@nestjs/common';
import { IssueService } from './issue.service';
import { WorkflowService } from './workflow.service';
import { CurrentUser, CurrentOrg } from '../auth/decorators/auth.decorator';
import { RequirePermission } from '../authz/decorators/permissions.decorator';
import { OrgPermission, ProjectPermission } from '../authz/permissions';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { TransitionIssueDto } from './dto/transition.dto';
import { SearchIssueDto } from './dto/search-issue.dto';
import { ApiSuccessEnvelope } from '@forgetrack/contracts';

@Controller()
export class IssueController {
  constructor(
    private readonly issueService: IssueService,
    private readonly workflowService: WorkflowService,
  ) {}

  @Post('projects/:projectId/issues')
  @RequirePermission(ProjectPermission.ISSUE_CREATE)
  async createIssue(
    @CurrentUser() user: any,
    @CurrentOrg() org: any,
    @Param('projectId') projectId: string,
    @Body() dto: CreateIssueDto,
  ): Promise<ApiSuccessEnvelope<any>> {
    const data = await this.issueService.createIssue(org.id, projectId, user.id, dto);
    return { data };
  }

  @Get('projects/:projectId/issues')
  @RequirePermission(ProjectPermission.ISSUE_READ)
  async listProjectIssues(
    @CurrentOrg() org: any,
    @Param('projectId') projectId: string,
  ): Promise<ApiSuccessEnvelope<any[]>> {
    const data = await this.issueService.searchIssues(org.id, { projectId });
    return { data };
  }

  @Get('issues/:issueId')
  @RequirePermission(ProjectPermission.ISSUE_READ)
  async getIssue(
    @Param('issueId') issueId: string,
  ): Promise<ApiSuccessEnvelope<any>> {
    const data = await this.issueService.getIssue(issueId);
    return { data };
  }

  @Get('issues/by-key/:projectKey/:number')
  @RequirePermission(ProjectPermission.ISSUE_READ)
  async getIssueByKey(
    @CurrentOrg() org: any,
    @Param('projectKey') projectKey: string,
    @Param('number', ParseIntPipe) number: number,
  ): Promise<ApiSuccessEnvelope<any>> {
    const data = await this.issueService.getIssueByKey(projectKey, number, org.id);
    return { data };
  }

  @Patch('issues/:issueId')
  @RequirePermission(ProjectPermission.ISSUE_UPDATE)
  async updateIssue(
    @CurrentOrg() org: any,
    @Param('issueId') issueId: string,
    @Body() dto: UpdateIssueDto,
  ): Promise<ApiSuccessEnvelope<any>> {
    const data = await this.issueService.updateIssue(issueId, org.id, dto);
    return { data };
  }

  @Post('issues/:issueId/archive')
  @RequirePermission(ProjectPermission.ISSUE_UPDATE)
  async archiveIssue(
    @CurrentOrg() org: any,
    @Param('issueId') issueId: string,
  ): Promise<ApiSuccessEnvelope<{ success: boolean }>> {
    await this.issueService.archiveIssue(issueId, org.id);
    return { data: { success: true } };
  }

  @Get('issues/:issueId/transitions')
  @RequirePermission(ProjectPermission.ISSUE_READ)
  async getTransitions(
    @Param('issueId') issueId: string,
  ): Promise<ApiSuccessEnvelope<any[]>> {
    const data = await this.workflowService.getTransitions(issueId);
    return { data };
  }

  @Post('issues/:issueId/transitions')
  @RequirePermission(ProjectPermission.ISSUE_TRANSITION)
  async transitionIssue(
    @CurrentUser() user: any,
    @Param('issueId') issueId: string,
    @Body() dto: TransitionIssueDto,
  ): Promise<ApiSuccessEnvelope<any>> {
    const data = await this.workflowService.transitionIssue(issueId, user.id, dto);
    return { data };
  }

  @Get('issues/:issueId/history')
  @RequirePermission(ProjectPermission.ISSUE_READ)
  async getHistory(
    @Param('issueId') issueId: string,
  ): Promise<ApiSuccessEnvelope<any[]>> {
    const data = await this.workflowService.getIssueHistory(issueId);
    return { data };
  }

  @Post('search')
  @RequirePermission(OrgPermission.READ)
  async searchIssues(
    @CurrentOrg() org: any,
    @Body() dto: SearchIssueDto,
  ): Promise<ApiSuccessEnvelope<any[]>> {
    const data = await this.issueService.searchIssues(org.id, dto);
    return { data };
  }

  @Post('saved-searches')
  @RequirePermission(OrgPermission.READ)
  async createSavedSearch(
    @CurrentUser() user: any,
    @CurrentOrg() org: any,
    @Body('name') name: string,
    @Body('filters') filters: any,
  ): Promise<ApiSuccessEnvelope<any>> {
    const data = await this.issueService.createSavedSearch(org.id, user.id, name, filters);
    return { data };
  }

  @Get('saved-searches')
  @RequirePermission(OrgPermission.READ)
  async listSavedSearches(
    @CurrentUser() user: any,
    @CurrentOrg() org: any,
  ): Promise<ApiSuccessEnvelope<any[]>> {
    const data = await this.issueService.listSavedSearches(org.id, user.id);
    return { data };
  }

  @Delete('saved-searches/:searchId')
  @RequirePermission(OrgPermission.READ)
  async deleteSavedSearch(
    @CurrentUser() user: any,
    @Param('searchId') searchId: string,
  ): Promise<ApiSuccessEnvelope<{ success: boolean }>> {
    await this.issueService.deleteSavedSearch(searchId, user.id);
    return { data: { success: true } };
  }
}
