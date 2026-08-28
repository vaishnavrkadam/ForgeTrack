import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { SearchIssueDto } from './dto/search-issue.dto';
import { NotificationService } from '../notification/notification.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class IssueService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly notificationService: NotificationService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Helper to fetch full issue context, labels, and custom field values
   */
  private async fetchFullIssue(issueId: string): Promise<any> {
    const issueRes = await this.dataSource.query(
      `SELECT 
        i.id, i.organization_id as "organizationId", i.project_id as "projectId", i.number,
        p.key as "projectKey", p.name as "projectName",
        i.title, i.description, i.reproduction_steps as "reproductionSteps",
        i.expected_result as "expectedResult", i.actual_result as "actualResult",
        i.environment, i.acceptance_criteria as "acceptanceCriteria",
        i.estimate_minutes as "estimateMinutes", i.time_spent_minutes as "timeSpentMinutes",
        i.due_at as "dueAt", i.resolved_at as "resolvedAt", i.closed_at as "closedAt",
        i.created_at as "createdAt", i.updated_at as "updatedAt",
        
        it.id as "issueTypeId", it.name as "issueTypeName", it.code as "issueTypeCode",
        s.id as "statusId", s.name as "statusName", s.code as "statusCode", s.category as "statusCategory",
        pr.id as "priorityId", pr.name as "priorityName", pr.code as "priorityCode",
        sv.id as "severityId", sv.name as "severityName", sv.code as "severityCode",
        c.id as "componentId", c.name as "componentName",
        v.id as "versionId", v.name as "versionName",
        m.id as "milestoneId", m.name as "milestoneName",
        
        rep.id as "reporterId", rep.display_name as "reporterName", rep.email as "reporterEmail",
        ass.id as "assigneeId", ass.display_name as "assigneeName", ass.email as "assigneeEmail"
       FROM issues i
       JOIN projects p ON p.id = i.project_id
       LEFT JOIN issue_types it ON it.id = i.issue_type_id
       LEFT JOIN statuses s ON s.id = i.status_id
       LEFT JOIN priorities pr ON pr.id = i.priority_id
       LEFT JOIN severities sv ON sv.id = i.severity_id
       LEFT JOIN components c ON c.id = i.component_id
       LEFT JOIN versions v ON v.id = i.version_id
       LEFT JOIN milestones m ON m.id = i.milestone_id
       LEFT JOIN users rep ON rep.id = i.reporter_id
       LEFT JOIN users ass ON ass.id = i.assignee_id
       WHERE i.id = $1 LIMIT 1`,
      [issueId],
    );

    if (issueRes.length === 0) {
      throw new NotFoundException('Issue not found');
    }
    const issue = issueRes[0];

    // Fetch Labels
    const labels = await this.dataSource.query(
      `SELECT l.id, l.name FROM labels l
       JOIN issue_labels il ON il.label_id = l.id
       WHERE il.issue_id = $1`,
      [issueId],
    );

    // Fetch Custom Field Values
    const customValues = await this.dataSource.query(
      `SELECT cf.key, cf.field_type as "fieldType",
              icv.text_value, icv.number_value, icv.boolean_value,
              icv.date_value, icv.datetime_value, icv.json_value
       FROM issue_custom_values icv
       JOIN custom_fields cf ON cf.id = icv.custom_field_id
       WHERE icv.issue_id = $1`,
      [issueId],
    );

    // Format custom values
    const customFields: Record<string, any> = {};
    for (const val of customValues) {
      let typedVal: any = null;
      switch (val.fieldType) {
        case 'INTEGER':
        case 'DECIMAL':
          typedVal = val.number_value ? Number(val.number_value) : null;
          break;
        case 'BOOLEAN':
          typedVal = val.boolean_value;
          break;
        case 'DATE':
          typedVal = val.date_value;
          break;
        case 'DATETIME':
          typedVal = val.datetime_value;
          break;
        case 'MULTI_SELECT':
        case 'JSON':
          typedVal = val.json_value;
          break;
        default:
          typedVal = val.text_value;
      }
      customFields[val.key] = typedVal;
    }

    return {
      ...issue,
      key: `${issue.projectKey}-${issue.number}`,
      labels,
      customFields,
    };
  }

  /**
   * Create a new issue in a project, allocating issue number atomically via lock
   */
  async createIssue(orgId: string, projectId: string, reporterId: string, dto: CreateIssueDto): Promise<any> {
    return this.dataSource.transaction(async (manager) => {
      // 1. Lock project row and allocate next issue number atomically
      const projectRes = await manager.query(
        `SELECT key, issue_counter FROM projects WHERE id = $1 FOR UPDATE`,
        [projectId],
      );
      if (projectRes.length === 0) {
        throw new NotFoundException('Project not found');
      }
      const project = projectRes[0];
      const issueNumber = Number(project.issue_counter) + 1;

      // Update counter
      await manager.query(
        `UPDATE projects SET issue_counter = issue_counter + 1 WHERE id = $1`,
        [projectId],
      );

      // 2. Fetch default status (first status in rank) if none specified
      let statusId = dto.statusId;
      if (!statusId) {
        const defaultStatus = await manager.query(
          `SELECT id FROM statuses WHERE project_id = $1 ORDER BY rank LIMIT 1`,
          [projectId],
        );
        if (defaultStatus.length === 0) {
          throw new BadRequestException('No status configurations exist for this project.');
        }
        statusId = defaultStatus[0].id;
      }

      // 3. Insert Issue
      const issueInsert = await manager.query(
        `INSERT INTO issues (
          organization_id, project_id, number, issue_type_id, status_id, priority_id, severity_id,
          component_id, version_id, milestone_id, reporter_id, assignee_id, title, description,
          reproduction_steps, expected_result, actual_result, environment, acceptance_criteria,
          estimate_minutes, due_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
         RETURNING id`,
        [
          orgId,
          projectId,
          issueNumber,
          dto.issueTypeId,
          statusId,
          dto.priorityId || null,
          dto.severityId || null,
          dto.componentId || null,
          dto.versionId || null,
          dto.milestoneId || null,
          reporterId,
          dto.assigneeId || null,
          dto.title,
          dto.description || null,
          dto.reproductionSteps || null,
          dto.expectedResult || null,
          dto.actualResult || null,
          dto.environment ? JSON.stringify(dto.environment) : null,
          dto.acceptanceCriteria || null,
          dto.estimateMinutes || null,
          dto.dueDate || null,
        ],
      );
      const issue = issueInsert[0];

      // 4. Associate Labels
      if (dto.labelIds && dto.labelIds.length > 0) {
        for (const labelId of dto.labelIds) {
          await manager.query(
            `INSERT INTO issue_labels (issue_id, label_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [issue.id, labelId],
          );
        }
      }

      // 5. Custom Fields Validation and Insertion
      if (dto.customFields && Object.keys(dto.customFields).length > 0) {
        const configFields = await manager.query(
          `SELECT id, key, field_type, is_required FROM custom_fields WHERE project_id = $1`,
          [projectId],
        );
        const configMap = new Map<string, any>(configFields.map((f: any) => [f.key, f]));

        for (const [key, value] of Object.entries(dto.customFields)) {
          const config = configMap.get(key);
          if (!config) {
            throw new BadRequestException(`Custom field "${key}" is not configured for this project.`);
          }

          // Insert custom value based on types
          let textVal: string | null = null;
          let numVal: number | null = null;
          let boolVal: boolean | null = null;
          let dateVal: string | null = null;
          let jsonVal: string | null = null;

          switch (config.field_type) {
            case 'INTEGER':
            case 'DECIMAL':
              numVal = Number(value);
              if (isNaN(numVal)) throw new BadRequestException(`Field "${key}" must be a number.`);
              break;
            case 'BOOLEAN':
              boolVal = Boolean(value);
              break;
            case 'DATE':
            case 'DATETIME':
              dateVal = String(value);
              break;
            case 'MULTI_SELECT':
            case 'JSON':
              jsonVal = JSON.stringify(value);
              break;
            default:
              textVal = String(value);
          }

          await manager.query(
            `INSERT INTO issue_custom_values (issue_id, custom_field_id, text_value, number_value, boolean_value, date_value, datetime_value, json_value)
             VALUES ($1, $2, $3, $4, $5, $6, $6, $7)`,
            [
              issue.id,
              config.id,
              textVal,
              numVal,
              boolVal,
              dateVal, // maps to date_value and datetime_value conditionally in pg
              jsonVal,
            ],
          );
        }
      }

      // 6. Log Transactional Outbox Event
      await this.notificationService.logOutboxEvent(manager, orgId, 'issue_created', {
        id: issue.id,
        projectId,
        projectKey: project.key,
        number: issueNumber,
        title: dto.title,
        assigneeId: dto.assigneeId || null,
      });

      // 7. Write audit log for issue creation
      await this.auditService.logEvent(
        manager, orgId, projectId, reporterId,
        'issue', issue.id, 'created',
        null, { title: dto.title, number: issueNumber }, {},
      );

      return this.fetchFullIssue(issue.id);
    });
  }

  async getIssue(issueId: string): Promise<any> {
    return this.fetchFullIssue(issueId);
  }

  async getIssueByKey(projectKey: string, number: number, orgId: string): Promise<any> {
    const projectRes = await this.dataSource.query(
      `SELECT id FROM projects WHERE organization_id = $1 AND key = $2 LIMIT 1`,
      [orgId, projectKey],
    );
    if (projectRes.length === 0) {
      throw new NotFoundException('Project key not found under organization');
    }

    const issueRes = await this.dataSource.query(
      `SELECT id FROM issues WHERE project_id = $1 AND number = $2 LIMIT 1`,
      [projectRes[0].id, number],
    );
    if (issueRes.length === 0) {
      throw new NotFoundException(`Issue ${projectKey}-${number} not found`);
    }

    return this.fetchFullIssue(issueRes[0].id);
  }

  /**
   * Update issue fields and update custom values/labels dynamically
   */
  async updateIssue(issueId: string, orgId: string, dto: UpdateIssueDto): Promise<any> {
    // 1. Tenant verification
    const existing = await this.dataSource.query(
      'SELECT id, project_id as "projectId" FROM issues WHERE id = $1 AND organization_id = $2 LIMIT 1',
      [issueId, orgId],
    );
    if (existing.length === 0) {
      throw new NotFoundException('Issue not found');
    }
    const projectId = existing[0].projectId;

    return this.dataSource.transaction(async (manager) => {
      // 2. Perform Dynamic DB Updates for main fields
      const updateFields: string[] = [];
      const parameters: any[] = [];
      let paramIndex = 1;

      const mappings: Record<string, string> = {
        title: 'title',
        description: 'description',
        issueTypeId: 'issue_type_id',
        statusId: 'status_id',
        priorityId: 'priority_id',
        severityId: 'severity_id',
        componentId: 'component_id',
        versionId: 'version_id',
        milestoneId: 'milestone_id',
        assigneeId: 'assignee_id',
        reproductionSteps: 'reproduction_steps',
        expectedResult: 'expected_result',
        actualResult: 'actual_result',
        acceptanceCriteria: 'acceptance_criteria',
        estimateMinutes: 'estimate_minutes',
        timeSpentMinutes: 'time_spent_minutes',
        dueDate: 'due_at',
      };

      for (const [key, dbColumn] of Object.entries(mappings)) {
        const val = (dto as any)[key];
        if (val !== undefined) {
          updateFields.push(`${dbColumn} = $${paramIndex++}`);
          parameters.push(val);
        }
      }

      if (dto.environment !== undefined) {
        updateFields.push(`environment = $${paramIndex++}`);
        parameters.push(dto.environment ? JSON.stringify(dto.environment) : null);
      }

      if (updateFields.length > 0) {
        updateFields.push(`updated_at = now()`);
        parameters.push(issueId);
        await manager.query(
          `UPDATE issues SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
          parameters,
        );
      }

      // 3. Update Labels if provided
      if (dto.labelIds !== undefined) {
        await manager.query(`DELETE FROM issue_labels WHERE issue_id = $1`, [issueId]);
        for (const labelId of dto.labelIds) {
          await manager.query(
            `INSERT INTO issue_labels (issue_id, label_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [issueId, labelId],
          );
        }
      }

      // 4. Update Custom Fields
      if (dto.customFields && Object.keys(dto.customFields).length > 0) {
        const configFields = await manager.query(
          `SELECT id, key, field_type FROM custom_fields WHERE project_id = $1`,
          [projectId],
        );
        const configMap = new Map<string, any>(configFields.map((f: any) => [f.key, f]));

        for (const [key, value] of Object.entries(dto.customFields)) {
          const config = configMap.get(key);
          if (!config) continue;

          await manager.query(
            `DELETE FROM issue_custom_values WHERE issue_id = $1 AND custom_field_id = $2`,
            [issueId, config.id],
          );

          if (value === null || value === undefined) continue;

          let textVal: string | null = null;
          let numVal: number | null = null;
          let boolVal: boolean | null = null;
          let dateVal: string | null = null;
          let jsonVal: string | null = null;

          switch (config.field_type) {
            case 'INTEGER':
            case 'DECIMAL':
              numVal = Number(value);
              break;
            case 'BOOLEAN':
              boolVal = Boolean(value);
              break;
            case 'DATE':
            case 'DATETIME':
              dateVal = String(value);
              break;
            case 'MULTI_SELECT':
            case 'JSON':
              jsonVal = JSON.stringify(value);
              break;
            default:
              textVal = String(value);
          }

          await manager.query(
            `INSERT INTO issue_custom_values (issue_id, custom_field_id, text_value, number_value, boolean_value, date_value, datetime_value, json_value)
             VALUES ($1, $2, $3, $4, $5, $6, $6, $7)`,
            [issueId, config.id, textVal, numVal, boolVal, dateVal, jsonVal],
          );
        }
      }

      return this.fetchFullIssue(issueId);
    });
  }

  /**
   * Archive issue (transitions status to closed)
   */
  async archiveIssue(issueId: string, orgId: string): Promise<void> {
    const existing = await this.dataSource.query(
      `SELECT project_id FROM issues WHERE id = $1 AND organization_id = $2 LIMIT 1`,
      [issueId, orgId],
    );
    if (existing.length === 0) {
      throw new NotFoundException('Issue not found');
    }

    const projectId = existing[0].project_id;
    // Find terminal status for archiving
    const terminalStatus = await this.dataSource.query(
      `SELECT id FROM statuses WHERE project_id = $1 AND is_terminal = true LIMIT 1`,
      [projectId],
    );

    if (terminalStatus.length > 0) {
      await this.dataSource.query(
        `UPDATE issues SET status_id = $1, closed_at = now() WHERE id = $2`,
        [terminalStatus[0].id, issueId],
      );
    } else {
      // Just mark closed_at
      await this.dataSource.query(
        `UPDATE issues SET closed_at = now() WHERE id = $1`,
        [issueId],
      );
    }
  }

  /**
   * Search issues with dynamic SQL query filters
   */
  async searchIssues(orgId: string, dto: SearchIssueDto): Promise<any[]> {
    const conditions: string[] = ['i.organization_id = $1'];
    const parameters: any[] = [orgId];
    let paramIndex = 2;

    if (dto.q) {
      conditions.push(`(i.title ILIKE $${paramIndex} OR i.description ILIKE $${paramIndex})`);
      parameters.push(`%${dto.q}%`);
      paramIndex++;
    }

    if (dto.projectId) {
      conditions.push(`i.project_id = $${paramIndex}`);
      parameters.push(dto.projectId);
      paramIndex++;
    }

    const arrayFilters: Record<string, string[] | undefined> = {
      'i.status_id': dto.statusIds,
      'i.priority_id': dto.priorityIds,
      'i.severity_id': dto.severityIds,
      'i.assignee_id': dto.assigneeIds,
      'i.reporter_id': dto.reporterIds,
      'i.component_id': dto.componentIds,
      'i.version_id': dto.versionIds,
      'i.milestone_id': dto.milestoneIds,
    };

    for (const [column, values] of Object.entries(arrayFilters)) {
      if (values && values.length > 0) {
        conditions.push(`${column} = ANY($${paramIndex})`);
        parameters.push(values);
        paramIndex++;
      }
    }

    if (dto.labels && dto.labels.length > 0) {
      conditions.push(`EXISTS (
        SELECT 1 FROM issue_labels il 
        JOIN labels l ON l.id = il.label_id 
        WHERE il.issue_id = i.id AND l.name = ANY($${paramIndex})
      )`);
      parameters.push(dto.labels);
      paramIndex++;
    }

    if (dto.customFields && Object.keys(dto.customFields).length > 0) {
      for (const [key, value] of Object.entries(dto.customFields)) {
        if (value !== undefined && value !== null) {
          conditions.push(`EXISTS (
            SELECT 1 FROM issue_custom_values icv
            JOIN custom_fields cf ON cf.id = icv.custom_field_id
            WHERE icv.issue_id = i.id AND cf.key = $${paramIndex}
            AND (
              icv.text_value = $${paramIndex + 1}::text OR
              icv.number_value = $${paramIndex + 1}::numeric OR
              icv.boolean_value = $${paramIndex + 1}::boolean
            )
          )`);
          parameters.push(key, value);
          paramIndex += 2;
        }
      }
    }

    const query = `
      SELECT DISTINCT 
        i.id, i.number, p.key as "projectKey", i.title, i.description,
        s.code as "statusCode", s.name as "statusName", s.category as "statusCategory",
        pr.code as "priorityCode", pr.name as "priorityName",
        sv.code as "severityCode", sv.name as "severityName",
        it.code as "issueTypeCode", it.name as "issueTypeName",
        rep.display_name as "reporterName", ass.display_name as "assigneeName",
        i.created_at as "createdAt", i.due_at as "dueAt"
      FROM issues i
      JOIN projects p ON p.id = i.project_id
      LEFT JOIN statuses s ON s.id = i.status_id
      LEFT JOIN priorities pr ON pr.id = i.priority_id
      LEFT JOIN severities sv ON sv.id = i.severity_id
      LEFT JOIN issue_types it ON it.id = i.issue_type_id
      LEFT JOIN users rep ON rep.id = i.reporter_id
      LEFT JOIN users ass ON ass.id = i.assignee_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY i.created_at DESC
    `;

    return this.dataSource.query(query, parameters);
  }

  /**
   * Save a named search query for future reuse
   */
  async createSavedSearch(orgId: string, userId: string, name: string, filters: any): Promise<any> {
    const res = await this.dataSource.query(
      `INSERT INTO saved_searches (organization_id, user_id, name, filters)
       VALUES ($1, $2, $3, $4::jsonb)
       RETURNING id, name, filters, created_at as "createdAt"`,
      [orgId, userId, name, JSON.stringify(filters || {})],
    );
    return res[0];
  }

  /**
   * List saved searches for current user in org
   */
  async listSavedSearches(orgId: string, userId: string): Promise<any[]> {
    return this.dataSource.query(
      `SELECT id, name, filters, created_at as "createdAt"
       FROM saved_searches
       WHERE organization_id = $1 AND user_id = $2
       ORDER BY created_at DESC`,
      [orgId, userId],
    );
  }

  /**
   * Delete a saved search by ID (owner only)
   */
  async deleteSavedSearch(searchId: string, userId: string): Promise<void> {
    await this.dataSource.query(
      `DELETE FROM saved_searches WHERE id = $1 AND user_id = $2`,
      [searchId, userId],
    );
  }
}
