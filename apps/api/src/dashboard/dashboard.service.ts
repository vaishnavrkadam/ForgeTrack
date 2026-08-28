import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DashboardService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Aggregate issue configuration metrics for a project
   */
  async getProjectDashboard(projectId: string): Promise<any> {
    const summary = await this.dataSource.query(
      `SELECT 
        COUNT(i.id) as "totalCount",
        COUNT(CASE WHEN s.category = 'TODO' THEN 1 END) as "todoCount",
        COUNT(CASE WHEN s.category = 'ACTIVE' THEN 1 END) as "activeCount",
        COUNT(CASE WHEN s.category = 'DONE' THEN 1 END) as "doneCount",
        COALESCE(SUM(i.estimate_minutes), 0) as "totalEstimateMinutes",
        COUNT(CASE WHEN i.due_at < now() AND s.category != 'DONE' THEN 1 END) as "overdueCount"
       FROM issues i
       JOIN statuses s ON s.id = i.status_id
       WHERE i.project_id = $1`,
      [projectId],
    );

    const byStatus = await this.dataSource.query(
      `SELECT s.id, s.name, s.code, s.category, COUNT(i.id) as count
       FROM statuses s
       LEFT JOIN issues i ON i.status_id = s.id
       WHERE s.project_id = $1
       GROUP BY s.id, s.name, s.code, s.category
       ORDER BY s.rank`,
      [projectId],
    );

    const byPriority = await this.dataSource.query(
      `SELECT pr.id, pr.name, pr.code, COUNT(i.id) as count
       FROM priorities pr
       LEFT JOIN issues i ON i.priority_id = pr.id
       WHERE pr.project_id = $1
       GROUP BY pr.id, pr.name, pr.code
       ORDER BY pr.rank DESC`,
      [projectId],
    );

    const byIssueType = await this.dataSource.query(
      `SELECT it.id, it.name, it.code, COUNT(i.id) as count
       FROM issue_types it
       LEFT JOIN issues i ON i.issue_type_id = it.id
       WHERE it.project_id = $1
       GROUP BY it.id, it.name, it.code`,
      [projectId],
    );

    const byComponent = await this.dataSource.query(
      `SELECT c.id, c.name, COUNT(i.id) as count
       FROM components c
       LEFT JOIN issues i ON i.component_id = c.id
       WHERE c.project_id = $1
       GROUP BY c.id, c.name`,
      [projectId],
    );

    const byMilestone = await this.dataSource.query(
      `SELECT m.id, m.name, m.status, COUNT(i.id) as count
       FROM milestones m
       LEFT JOIN issues i ON i.milestone_id = m.id
       WHERE m.project_id = $1
       GROUP BY m.id, m.name, m.status`,
      [projectId],
    );

    return {
      summary: summary[0],
      byStatus,
      byPriority,
      byIssueType,
      byComponent,
      byMilestone,
    };
  }

  /**
   * Aggregate KPI metrics across all projects under an organization
   */
  async getOrganizationDashboard(orgId: string): Promise<any> {
    const summary = await this.dataSource.query(
      `SELECT 
        COUNT(DISTINCT p.id) as "projectCount",
        COUNT(i.id) as "issueCount",
        COUNT(CASE WHEN s.category = 'TODO' THEN 1 END) as "todoCount",
        COUNT(CASE WHEN s.category = 'ACTIVE' THEN 1 END) as "activeCount",
        COUNT(CASE WHEN s.category = 'DONE' THEN 1 END) as "doneCount"
       FROM projects p
       LEFT JOIN issues i ON i.project_id = p.id
       LEFT JOIN statuses s ON s.id = i.status_id
       WHERE p.organization_id = $1`,
      [orgId],
    );

    const projectsOverview = await this.dataSource.query(
      `SELECT p.id, p.key, p.name, p.status,
              COUNT(i.id) as "totalIssues",
              COUNT(CASE WHEN s.category = 'ACTIVE' THEN 1 END) as "activeIssues"
       FROM projects p
       LEFT JOIN issues i ON i.project_id = p.id
       LEFT JOIN statuses s ON s.id = i.status_id
       WHERE p.organization_id = $1
       GROUP BY p.id, p.key, p.name, p.status
       ORDER BY p.key`,
      [orgId],
    );

    return {
      summary: summary[0],
      projectsOverview,
    };
  }

  /**
   * Query developer workloads: number of active issues assigned and estimate aggregates
   */
  async getUserWorkloads(orgId: string): Promise<any[]> {
    return this.dataSource.query(
      `SELECT u.id as "userId", u.display_name as "displayName", u.email,
              COUNT(i.id) as "activeIssuesCount",
              COALESCE(SUM(i.estimate_minutes), 0) as "totalEstimateMinutes",
              COALESCE(SUM(i.time_spent_minutes), 0) as "totalTimeSpentMinutes"
       FROM users u
       JOIN organization_members om ON om.user_id = u.id AND om.organization_id = $1
       LEFT JOIN issues i ON i.assignee_id = u.id AND i.organization_id = $1
       LEFT JOIN statuses s ON s.id = i.status_id
       WHERE om.status = 'ACTIVE' AND (s.category IS NULL OR s.category != 'DONE')
       GROUP BY u.id, u.display_name, u.email
       ORDER BY "activeIssuesCount" DESC`,
      [orgId],
    );
  }

  /**
   * Average resolution time for closed issues in a project (in hours)
   */
  async getResolutionTime(projectId: string): Promise<any> {
    const res = await this.dataSource.query(
      `SELECT
         ROUND(AVG(EXTRACT(EPOCH FROM (i.resolved_at - i.created_at)) / 3600)::numeric, 2) as "avgResolutionHours",
         ROUND(MIN(EXTRACT(EPOCH FROM (i.resolved_at - i.created_at)) / 3600)::numeric, 2) as "minResolutionHours",
         ROUND(MAX(EXTRACT(EPOCH FROM (i.resolved_at - i.created_at)) / 3600)::numeric, 2) as "maxResolutionHours",
         COUNT(*) as "resolvedCount"
       FROM issues i
       WHERE i.project_id = $1 AND i.resolved_at IS NOT NULL`,
      [projectId],
    );
    return res[0];
  }

  /**
   * Issue creation trend: daily counts over last 30 days
   */
  async getIssueTrend(projectId: string): Promise<any[]> {
    return this.dataSource.query(
      `SELECT DATE(i.created_at) as date, COUNT(i.id) as "issueCount"
       FROM issues i
       WHERE i.project_id = $1
         AND i.created_at >= now() - INTERVAL '30 days'
       GROUP BY DATE(i.created_at)
       ORDER BY date ASC`,
      [projectId],
    );
  }

  /**
   * Release progress: issues grouped by version and completion status
   */
  async getReleaseProgress(projectId: string): Promise<any[]> {
    return this.dataSource.query(
      `SELECT
         v.id as "versionId", v.name as "versionName", v.status as "versionStatus",
         COUNT(i.id) as "totalIssues",
         COUNT(CASE WHEN s.category = 'DONE' THEN 1 END) as "doneIssues",
         COUNT(CASE WHEN s.category != 'DONE' THEN 1 END) as "pendingIssues"
       FROM versions v
       LEFT JOIN issues i ON i.version_id = v.id
       LEFT JOIN statuses s ON s.id = i.status_id
       WHERE v.project_id = $1
       GROUP BY v.id, v.name, v.status
       ORDER BY v.released_at DESC NULLS LAST`,
      [projectId],
    );
  }
}
