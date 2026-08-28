import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CiRunDto, ReleaseHealthDto } from '@forgetrack/contracts';

@Injectable()
export class ReleaseCiService {
  private readonly logger = new Logger(ReleaseCiService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Ingest or register a new CI run
   */
  async recordCiRun(
    orgId: string,
    projectId: string,
    data: {
      repositoryId?: string;
      commitSha: string;
      branch?: string;
      workflowName?: string;
      runNumber?: string;
      status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
      conclusion?: string;
      url?: string;
      metadata?: Record<string, any>;
      startedAt?: string;
      finishedAt?: string;
    },
  ): Promise<CiRunDto> {
    if (!data.commitSha) {
      throw new BadRequestException('commitSha is required for CI run');
    }

    const res = await this.dataSource.query(
      `INSERT INTO ci_runs (
        organization_id, project_id, repository_id, commit_sha, branch,
        workflow_name, run_number, status, conclusion, url, metadata,
        started_at, finished_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13)
      RETURNING id, organization_id as "organizationId", project_id as "projectId",
                repository_id as "repositoryId", commit_sha as "commitSha", branch,
                workflow_name as "workflowName", run_number as "runNumber",
                status, conclusion, url, metadata, started_at as "startedAt",
                finished_at as "finishedAt", created_at as "createdAt"`,
      [
        orgId,
        projectId,
        data.repositoryId || null,
        data.commitSha,
        data.branch || null,
        data.workflowName || 'CI Workflow',
        data.runNumber || null,
        data.status,
        data.conclusion || null,
        data.url || null,
        JSON.stringify(data.metadata || {}),
        data.startedAt ? new Date(data.startedAt) : new Date(),
        data.finishedAt ? new Date(data.finishedAt) : null,
      ],
    );

    const run = res[0];
    this.logger.log(`Recorded CI run ${run.id} for commit ${data.commitSha} (${data.status})`);

    // Find issues linked to this commit and record CI_BUILD code_links
    const linkedIssues = await this.dataSource.query(
      `SELECT DISTINCT issue_id as "issueId" FROM code_links WHERE external_type = 'COMMIT' AND external_id = $1`,
      [data.commitSha],
    );

    for (const item of linkedIssues) {
      await this.dataSource.query(
        `INSERT INTO code_links (issue_id, repository_id, external_type, external_id, title, url, metadata)
         VALUES ($1, $2, 'CI_BUILD', $3, $4, $5, $6::jsonb)`,
        [
          item.issueId,
          data.repositoryId || null,
          run.id,
          `CI ${data.workflowName || 'Build'} - ${data.status}`,
          data.url || '',
          JSON.stringify({ status: data.status, conclusion: data.conclusion, commitSha: data.commitSha }),
        ],
      );
    }

    return run;
  }

  /**
   * List CI runs for a project
   */
  async listCiRuns(projectId: string, limit: number = 50): Promise<CiRunDto[]> {
    return this.dataSource.query(
      `SELECT id, organization_id as "organizationId", project_id as "projectId",
              repository_id as "repositoryId", commit_sha as "commitSha", branch,
              workflow_name as "workflowName", run_number as "runNumber",
              status, conclusion, url, metadata, started_at as "startedAt",
              finished_at as "finishedAt", created_at as "createdAt"
       FROM ci_runs
       WHERE project_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [projectId, limit],
    );
  }

  /**
   * Get CI runs for a specific issue
   */
  async getIssueCiRuns(issueId: string): Promise<CiRunDto[]> {
    return this.dataSource.query(
      `SELECT r.id, r.organization_id as "organizationId", r.project_id as "projectId",
              r.repository_id as "repositoryId", r.commit_sha as "commitSha", r.branch,
              r.workflow_name as "workflowName", r.run_number as "runNumber",
              r.status, r.conclusion, r.url, r.metadata, r.started_at as "startedAt",
              r.finished_at as "finishedAt", r.created_at as "createdAt"
       FROM ci_runs r
       WHERE r.commit_sha IN (
         SELECT cl.external_id FROM code_links cl WHERE cl.issue_id = $1 AND cl.external_type = 'COMMIT'
       ) OR r.id IN (
         SELECT cl.external_id::uuid FROM code_links cl WHERE cl.issue_id = $1 AND cl.external_type = 'CI_BUILD' AND cl.external_id ~ '^[0-9a-fA-F-]{36}$'
       )
       ORDER BY r.created_at DESC`,
      [issueId],
    );
  }

  /**
   * Compute comprehensive Release Health & Intelligence analytics
   */
  async getReleaseHealth(projectId: string, versionId: string): Promise<ReleaseHealthDto> {
    // 1. Get version details
    const versionRes = await this.dataSource.query(
      `SELECT id, name, status, release_date as "releaseDate" FROM versions WHERE id = $1 AND project_id = $2 LIMIT 1`,
      [versionId, projectId],
    );
    if (versionRes.length === 0) {
      throw new NotFoundException('Version/Release not found for this project');
    }
    const version = versionRes[0];

    // 2. Fetch issues linked to version
    const issues = await this.dataSource.query(
      `SELECT i.id, i.number, s.category as "statusCategory",
              p.code as "priorityCode", sv.code as "severityCode"
       FROM issues i
       LEFT JOIN statuses s ON s.id = i.status_id
       LEFT JOIN priorities p ON p.id = i.priority_id
       LEFT JOIN severities sv ON sv.id = i.severity_id
       WHERE i.version_id = $1`,
      [versionId],
    );

    const totalIssues = issues.length;
    let done = 0;
    let inProgress = 0;
    let todo = 0;
    let blockingDefectsCount = 0;
    let criticalDefectsCount = 0;

    for (const issue of issues) {
      if (issue.statusCategory === 'DONE') {
        done++;
      } else if (issue.statusCategory === 'IN_PROGRESS') {
        inProgress++;
      } else {
        todo++;
      }

      // Check open blocking / critical defects
      if (issue.statusCategory !== 'DONE') {
        if (issue.severityCode === 'BLOCKER' || issue.priorityCode === 'URGENT') {
          blockingDefectsCount++;
        }
        if (issue.severityCode === 'CRITICAL') {
          criticalDefectsCount++;
        }
      }
    }

    const completionPercentage = totalIssues > 0 ? Math.round((done / totalIssues) * 100) : 100;

    // 3. Query CI runs related to version issues
    const ciStats = await this.dataSource.query(
      `SELECT 
        COUNT(*) as "totalRuns",
        COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END) as "successRuns",
        COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as "failedRuns"
       FROM ci_runs
       WHERE project_id = $1 AND commit_sha IN (
         SELECT cl.external_id FROM code_links cl
         JOIN issues i ON i.id = cl.issue_id
         WHERE i.version_id = $2 AND cl.external_type = 'COMMIT'
       )`,
      [projectId, versionId],
    );

    const totalRuns = parseInt(ciStats[0]?.totalRuns || '0', 10);
    const successRuns = parseInt(ciStats[0]?.successRuns || '0', 10);
    const failedRuns = parseInt(ciStats[0]?.failedRuns || '0', 10);
    const passRatePercentage = totalRuns > 0 ? Math.round((successRuns / totalRuns) * 100) : 100;

    // 4. Assess risk factors and health status
    const riskFactors: string[] = [];

    if (blockingDefectsCount > 0) {
      riskFactors.push(`${blockingDefectsCount} uncompleted blocker defect(s) pending resolution.`);
    }
    if (criticalDefectsCount > 0) {
      riskFactors.push(`${criticalDefectsCount} critical issue(s) remaining in progress or todo.`);
    }
    if (totalRuns > 0 && passRatePercentage < 90) {
      riskFactors.push(`CI build pass rate is degraded at ${passRatePercentage}%.`);
    }
    if (totalIssues > 0 && completionPercentage < 50) {
      riskFactors.push(`Low scope completion rate (${completionPercentage}%).`);
    }

    let healthStatus: 'HEALTHY' | 'AT_RISK' | 'CRITICAL' = 'HEALTHY';
    if (blockingDefectsCount > 0 || (totalRuns > 0 && passRatePercentage < 75)) {
      healthStatus = 'CRITICAL';
    } else if (criticalDefectsCount > 0 || riskFactors.length > 0) {
      healthStatus = 'AT_RISK';
    }

    return {
      versionId: version.id,
      versionName: version.name,
      totalIssues,
      statusBreakdown: { done, inProgress, todo },
      completionPercentage,
      blockingDefectsCount,
      criticalDefectsCount,
      ciRunsSummary: {
        totalRuns,
        successRuns,
        failedRuns,
        passRatePercentage,
      },
      healthStatus,
      riskFactors,
    };
  }
}
