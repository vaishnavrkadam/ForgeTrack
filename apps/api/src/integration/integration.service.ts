import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { IssueService } from '../issue/issue.service';
import { ImportJobDto } from '@forgetrack/contracts';

@Injectable()
export class IntegrationService {
  private readonly logger = new Logger(IntegrationService.name);

  constructor(
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => IssueService))
    private readonly issueService: IssueService,
  ) {}

  /**
   * Fetch all project issues for JSON download
   */
  async exportIssuesJson(projectId: string): Promise<any[]> {
    const issues = await this.dataSource.query(
      `SELECT id FROM issues WHERE project_id = $1 ORDER BY number DESC`,
      [projectId],
    );

    const fullIssues = [];
    for (const item of issues) {
      const issue = await this.issueService.getIssue(item.id);
      fullIssues.push(issue);
    }
    return fullIssues;
  }

  /**
   * Export project issues in CSV format
   */
  async exportIssuesCsv(projectId: string): Promise<string> {
    const data = await this.exportIssuesJson(projectId);
    const headers = [
      'Key', 'Number', 'Title', 'Description', 'Type', 'Status',
      'Priority', 'Severity', 'Component', 'Version', 'Milestone',
      'Assignee', 'Reporter', 'EstimateMinutes', 'TimeSpentMinutes',
      'CreatedAt', 'ResolvedAt', 'ClosedAt',
    ];

    const rows = data.map(i => [
      i.key,
      i.number,
      i.title,
      i.description || '',
      i.issueTypeName || '',
      i.statusName || i.statusCode || '',
      i.priorityName || i.priorityCode || '',
      i.severityName || i.severityCode || '',
      i.componentName || '',
      i.versionName || '',
      i.milestoneName || '',
      i.assigneeName || '',
      i.reporterName || '',
      i.estimateMinutes || 0,
      i.timeSpentMinutes || 0,
      i.createdAt,
      i.resolvedAt || '',
      i.closedAt || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    return csvContent;
  }

  /**
   * Robust CSV Parser handling RFC-4180 quotes, commas, and newlines
   */
  parseCsv(content: string): Array<Record<string, string>> {
    if (!content || !content.trim()) return [];

    const lines: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const nextChar = content[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentField += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') i++; // CRLF
        currentRow.push(currentField.trim());
        if (currentRow.some(col => col.length > 0)) {
          lines.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }

    if (currentField || currentRow.length > 0) {
      currentRow.push(currentField.trim());
      if (currentRow.some(col => col.length > 0)) {
        lines.push(currentRow);
      }
    }

    if (lines.length <= 1) return [];

    const headers = lines[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const result: Array<Record<string, string>> = [];

    for (let r = 1; r < lines.length; r++) {
      const row = lines[r];
      const record: Record<string, string> = {};
      headers.forEach((header, idx) => {
        record[header] = row[idx] || '';
      });
      result.push(record);
    }

    return result;
  }

  /**
   * Bugzilla Compatibility Parser (JSON or XML/text representation)
   */
  parseBugzilla(payload: any): any[] {
    let rawBugs: any[] = [];
    if (Array.isArray(payload)) {
      rawBugs = payload;
    } else if (payload && Array.isArray(payload.bugs)) {
      rawBugs = payload.bugs;
    } else if (typeof payload === 'string') {
      try {
        const parsed = JSON.parse(payload);
        rawBugs = Array.isArray(parsed) ? parsed : (parsed.bugs || []);
      } catch {
        // Simple XML/text extraction fallback for Bugzilla format
        const titleMatches = payload.match(/<short_desc>(.*?)<\/short_desc>/g) || [];
        rawBugs = titleMatches.map((m: string) => ({
          summary: m.replace(/<\/?short_desc>/g, ''),
        }));
      }
    }

    return rawBugs.map(bug => {
      const title = bug.summary || bug.short_desc || 'Imported Bugzilla Issue';
      const description = bug.description || (Array.isArray(bug.comments) ? bug.comments.map((c: any) => c.text).join('\n\n') : '') || '';
      const priorityMap: Record<string, string> = {
        'P1': 'URGENT', 'P2': 'HIGH', 'P3': 'MEDIUM', 'P4': 'LOW', 'P5': 'LOW',
      };
      const severityMap: Record<string, string> = {
        'blocker': 'BLOCKER', 'critical': 'CRITICAL', 'major': 'MAJOR',
        'normal': 'MAJOR', 'minor': 'MINOR', 'trivial': 'TRIVIAL', 'enhancement': 'TRIVIAL',
      };

      return {
        title,
        description,
        typeCode: bug.severity === 'enhancement' ? 'FEATURE' : 'BUG',
        priorityCode: priorityMap[bug.priority] || 'MEDIUM',
        severityCode: severityMap[String(bug.severity).toLowerCase()] || 'MAJOR',
        environment: {
          os: bug.op_sys || undefined,
          platform: bug.rep_platform || undefined,
          version: bug.version || undefined,
        },
      };
    });
  }

  /**
   * Trigger an asynchronous import job in the background
   */
  async triggerImportJob(
    projectId: string,
    orgId: string,
    userId: string,
    issues: any[],
    sourceType: 'CSV' | 'JSON' | 'BUGZILLA' = 'JSON',
  ): Promise<ImportJobDto> {
    if (!Array.isArray(issues)) {
      throw new BadRequestException('Import payload must contain an array of issue records');
    }

    const jobRes = await this.dataSource.query(
      `INSERT INTO import_jobs (organization_id, project_id, created_by, source_type, status, total_records, successful_records, failed_records)
       VALUES ($1, $2, $3, $4, 'PENDING', $5, 0, 0)
       RETURNING id, organization_id as "organizationId", project_id as "projectId",
                 source_type as "sourceType", status, total_records as "totalRecords",
                 successful_records as "processedRecords", failed_records as "failedRecords",
                 created_at as "createdAt"`,
      [orgId, projectId, userId, sourceType, issues.length],
    );
    const job = jobRes[0];

    // Spin off asynchronous processing
    setImmediate(() => this.processImportJob(job.id, orgId, projectId, userId, issues));

    return {
      ...job,
      errors: [],
    };
  }

  /**
   * Check on import job status
   */
  async getImportJobStatus(jobId: string): Promise<ImportJobDto> {
    const res = await this.dataSource.query(
      `SELECT id, organization_id as "organizationId", project_id as "projectId",
              source_type as "sourceType", status, total_records as "totalRecords",
              successful_records as "processedRecords", failed_records as "failedRecords",
              created_at as "createdAt", finished_at as "finishedAt"
       FROM import_jobs WHERE id = $1 LIMIT 1`,
      [jobId],
    );
    if (res.length === 0) throw new NotFoundException('Import job not found');
    const errors = await this.getImportJobErrors(jobId);

    return {
      ...res[0],
      errors,
    };
  }

  /**
   * Get detailed error report for an import job
   */
  async getImportJobErrors(jobId: string): Promise<any[]> {
    const res = await this.dataSource.query(
      `SELECT error_report_object_key FROM import_jobs WHERE id = $1 LIMIT 1`,
      [jobId],
    );
    if (res.length === 0) throw new NotFoundException('Import job not found');

    if (res[0].error_report_object_key) {
      try {
        return JSON.parse(res[0].error_report_object_key);
      } catch {
        return [];
      }
    }
    return [];
  }

  /**
   * Run background validation and record insertion loops
   */
  private async processImportJob(jobId: string, orgId: string, projectId: string, userId: string, issues: any[]): Promise<void> {
    await this.dataSource.query(`UPDATE import_jobs SET status = 'PROCESSING', started_at = now() WHERE id = $1`, [jobId]);

    let processed = 0;
    let failed = 0;
    const errorsList: any[] = [];

    // Pre-cache project default mappings
    const typeRes = await this.dataSource.query('SELECT id, code FROM issue_types WHERE project_id = $1', [projectId]);
    const typeMap = new Map<string, string>(typeRes.map((t: any) => [t.code.toUpperCase(), t.id]));
    const defaultTypeId = typeRes[0]?.id || '00000000-0000-0000-0000-000000000000';

    const prioRes = await this.dataSource.query('SELECT id, code FROM priorities WHERE project_id = $1', [projectId]);
    const prioMap = new Map<string, string>(prioRes.map((p: any) => [p.code.toUpperCase(), p.id]));

    const sevRes = await this.dataSource.query('SELECT id, code FROM severities WHERE project_id = $1', [projectId]);
    const sevMap = new Map<string, string>(sevRes.map((s: any) => [s.code.toUpperCase(), s.id]));

    for (let index = 0; index < issues.length; index++) {
      const item = issues[index];
      try {
        const title = item.title || item.summary;
        if (!title || typeof title !== 'string' || title.trim().length === 0) {
          throw new Error('Title is missing or empty.');
        }

        const typeCode = (item.typeCode || item.type || 'BUG').toUpperCase();
        const issueTypeId = typeMap.get(typeCode) || defaultTypeId;
        const priorityId = item.priorityCode ? prioMap.get(item.priorityCode.toUpperCase()) : undefined;
        const severityId = item.severityCode ? sevMap.get(item.severityCode.toUpperCase()) : undefined;

        const dto = {
          issueTypeId,
          title: title.trim(),
          description: item.description || undefined,
          priorityId,
          severityId,
          environment: item.environment || undefined,
          acceptanceCriteria: item.acceptanceCriteria || undefined,
          estimateMinutes: item.estimateMinutes ? Number(item.estimateMinutes) : undefined,
          dueDate: item.dueDate || undefined,
        };

        await this.issueService.createIssue(orgId, projectId, userId, dto);
        processed++;
      } catch (err: any) {
        failed++;
        errorsList.push({
          recordIndex: index,
          title: item.title || item.summary || 'Unknown',
          errorMessage: err.message || 'Validation failed',
        });
      }

      // Periodically update progress in DB
      if (index % 10 === 0 || index === issues.length - 1) {
        await this.dataSource.query(
          `UPDATE import_jobs 
           SET successful_records = $1, failed_records = $2, error_report_object_key = $3
           WHERE id = $4`,
          [processed, failed, JSON.stringify(errorsList), jobId],
        );
      }
    }

    const finalStatus = (failed === issues.length && issues.length > 0) ? 'FAILED' : 'COMPLETED';
    await this.dataSource.query(
      `UPDATE import_jobs SET status = $1, finished_at = now() WHERE id = $2`,
      [finalStatus, jobId],
    );
    this.logger.log(`Import job ${jobId} finished: ${processed} success, ${failed} failed.`);
  }
}
