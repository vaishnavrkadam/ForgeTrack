import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { AiService } from './ai.service';
import { CurrentUser, CurrentOrg } from '../auth/decorators/auth.decorator';
import { RequirePermission } from '../authz/decorators/permissions.decorator';
import { OrgPermission, ProjectPermission } from '../authz/permissions';
import { SearchIssueDto } from '../issue/dto/search-issue.dto';
import {
  ApiSuccessEnvelope,
  AiDuplicateCandidateDto,
  AiQualityCheckResultDto,
  AiTriageSuggestionDto,
  AiSuggestionRecordDto,
  AiSummaryDto,
} from '@forgetrack/contracts';

@Controller()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('search/semantic')
  @RequirePermission(OrgPermission.READ)
  async semanticSearch(
    @CurrentOrg() org: any,
    @Body('query') query: string,
    @Body('projectIds') projectIds?: string[],
    @Query('limit') limit?: string,
  ): Promise<ApiSuccessEnvelope<any[]>> {
    const data = await this.aiService.semanticSearch(org.id, query || '', limit ? parseInt(limit, 10) : 20, projectIds);
    return { data };
  }

  @Post('search/hybrid')
  @RequirePermission(OrgPermission.READ)
  async hybridSearch(
    @CurrentOrg() org: any,
    @Body() dto: SearchIssueDto,
  ): Promise<ApiSuccessEnvelope<any[]>> {
    const data = await this.aiService.hybridSearch(org.id, dto);
    return { data };
  }

  /**
   * Phase 17: Duplicate Detection
   */
  @Post('issues/:issueId/ai/duplicates')
  @RequirePermission(ProjectPermission.ISSUE_READ)
  async findDuplicates(
    @Param('issueId') issueId: string,
    @Body('projectId') bodyProjectId?: string,
    @Query('projectId') queryProjectId?: string,
  ): Promise<ApiSuccessEnvelope<AiDuplicateCandidateDto[]>> {
    const projectId = bodyProjectId || queryProjectId || '';
    const data = await this.aiService.findDuplicates(projectId, issueId);
    return { data };
  }

  @Get('projects/:projectId/issues/:issueId/duplicates')
  @RequirePermission(ProjectPermission.ISSUE_READ)
  async findProjectDuplicates(
    @Param('projectId') projectId: string,
    @Param('issueId') issueId: string,
  ): Promise<ApiSuccessEnvelope<AiDuplicateCandidateDto[]>> {
    const data = await this.aiService.findDuplicates(projectId, issueId);
    return { data };
  }

  /**
   * Phase 18: Issue Quality Check Assistant
   */
  @Post('issues/:issueId/ai/quality-check')
  @RequirePermission(ProjectPermission.ISSUE_READ)
  async qualityCheck(
    @Param('issueId') issueId: string,
  ): Promise<ApiSuccessEnvelope<AiQualityCheckResultDto>> {
    const data = await this.aiService.qualityCheck(issueId);
    return { data };
  }

  /**
   * Phase 18: Triage Classification
   */
  @Post('issues/:issueId/ai/triage')
  @RequirePermission(ProjectPermission.ISSUE_READ)
  async triageIssue(
    @Param('issueId') issueId: string,
    @Body('projectId') bodyProjectId?: string,
    @Query('projectId') queryProjectId?: string,
  ): Promise<ApiSuccessEnvelope<AiTriageSuggestionDto>> {
    const projectId = bodyProjectId || queryProjectId || '';
    const data = await this.aiService.triageIssue(projectId, issueId);
    return { data };
  }

  @Post('issues/suggest-metadata')
  async suggestMetadata(
    @Body('title') title: string,
    @Body('description') description: string,
  ): Promise<ApiSuccessEnvelope<any>> {
    const data = await this.aiService.suggestMetadata(title || '', description || '');
    return { data };
  }

  /**
   * Phase 19: Issue Summary with Caching
   */
  @Post('issues/:issueId/ai/summary')
  @RequirePermission(ProjectPermission.ISSUE_READ)
  async summarizeIssue(
    @Param('issueId') issueId: string,
  ): Promise<ApiSuccessEnvelope<AiSummaryDto>> {
    const data = await this.aiService.summarizeIssue(issueId);
    return { data };
  }

  /**
   * Suggestion Lifecycle Endpoints
   */
  @Post('ai/suggestions/:id/accept')
  @RequirePermission(ProjectPermission.ISSUE_UPDATE)
  async acceptSuggestion(
    @CurrentUser() user: any,
    @Param('id') suggestionId: string,
  ): Promise<ApiSuccessEnvelope<any>> {
    const data = await this.aiService.acceptSuggestion(suggestionId, user.id);
    return { data };
  }

  @Post('ai/suggestions/:id/reject')
  @RequirePermission(ProjectPermission.ISSUE_UPDATE)
  async rejectSuggestion(
    @CurrentUser() user: any,
    @Param('id') suggestionId: string,
  ): Promise<ApiSuccessEnvelope<any>> {
    const data = await this.aiService.rejectSuggestion(suggestionId, user.id);
    return { data };
  }

  @Get('issues/:issueId/ai/suggestions')
  @RequirePermission(ProjectPermission.ISSUE_READ)
  async getIssueSuggestions(
    @Param('issueId') issueId: string,
  ): Promise<ApiSuccessEnvelope<AiSuggestionRecordDto[]>> {
    const data = await this.aiService.getIssueSuggestions(issueId);
    return { data };
  }
}
