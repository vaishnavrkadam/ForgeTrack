import { Controller, Get, Post, Body, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { IntegrationService } from './integration.service';
import { CurrentUser, CurrentOrg } from '../auth/decorators/auth.decorator';
import { RequirePermission } from '../authz/decorators/permissions.decorator';
import { ProjectPermission } from '../authz/permissions';
import { ApiSuccessEnvelope, ImportJobDto } from '@forgetrack/contracts';

@Controller()
export class IntegrationController {
  constructor(private readonly integrationService: IntegrationService) {}

  @Get('projects/:projectId/export/json')
  @RequirePermission(ProjectPermission.READ)
  async exportJson(
    @Param('projectId') projectId: string,
    @Res() response: Response,
  ): Promise<void> {
    const data = await this.integrationService.exportIssuesJson(projectId);
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('Content-Disposition', `attachment; filename="forgetrack-export-${projectId}.json"`);
    response.status(200).json(data);
  }

  @Get('projects/:projectId/export/csv')
  @RequirePermission(ProjectPermission.READ)
  async exportCsv(
    @Param('projectId') projectId: string,
    @Res() response: Response,
  ): Promise<void> {
    const csvData = await this.integrationService.exportIssuesCsv(projectId);
    response.setHeader('Content-Type', 'text/csv');
    response.setHeader('Content-Disposition', `attachment; filename="forgetrack-export-${projectId}.csv"`);
    response.status(200).send(csvData);
  }

  @Post('projects/:projectId/exports')
  @RequirePermission(ProjectPermission.READ)
  async createExport(
    @Param('projectId') projectId: string,
    @Body('format') format: 'csv' | 'json' = 'json',
  ): Promise<ApiSuccessEnvelope<any>> {
    if (format === 'csv') {
      const csv = await this.integrationService.exportIssuesCsv(projectId);
      return { data: { format: 'csv', content: csv } };
    }
    const data = await this.integrationService.exportIssuesJson(projectId);
    return { data: { format: 'json', content: data } };
  }

  /**
   * Phase 20: Import Issues (Supports JSON arrays, parsed CSVs, or Bugzilla formats)
   */
  @Post('projects/:projectId/imports')
  @RequirePermission(ProjectPermission.UPDATE)
  async triggerImport(
    @CurrentUser() user: any,
    @CurrentOrg() org: any,
    @Param('projectId') projectId: string,
    @Body('sourceType') sourceType: 'CSV' | 'JSON' | 'BUGZILLA' = 'JSON',
    @Body('issues') issues?: any[],
    @Body('csvContent') csvContent?: string,
    @Body('bugzillaPayload') bugzillaPayload?: any,
  ): Promise<ApiSuccessEnvelope<ImportJobDto>> {
    let issueList: any[] = [];

    if (sourceType === 'CSV' && csvContent) {
      issueList = this.integrationService.parseCsv(csvContent);
    } else if (sourceType === 'BUGZILLA' && bugzillaPayload) {
      issueList = this.integrationService.parseBugzilla(bugzillaPayload);
    } else {
      issueList = issues || [];
    }

    const data = await this.integrationService.triggerImportJob(projectId, org.id, user.id, issueList, sourceType);
    return { data };
  }

  @Get('imports/:id')
  @RequirePermission(ProjectPermission.READ)
  async getJobStatus(
    @Param('id') jobId: string,
  ): Promise<ApiSuccessEnvelope<ImportJobDto>> {
    const data = await this.integrationService.getImportJobStatus(jobId);
    return { data };
  }

  @Get('imports/:id/errors')
  @RequirePermission(ProjectPermission.READ)
  async getJobErrors(
    @Param('id') jobId: string,
  ): Promise<ApiSuccessEnvelope<any[]>> {
    const data = await this.integrationService.getImportJobErrors(jobId);
    return { data };
  }
}
