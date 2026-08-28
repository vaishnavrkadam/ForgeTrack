import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TransitionIssueDto } from './dto/transition.dto';
import { NotificationService } from '../notification/notification.service';
import { AutomationService } from '../automation/automation.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class WorkflowService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly notificationService: NotificationService,
    private readonly automationService: AutomationService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * List allowed transitions from the current status of an issue
   */
  async getTransitions(issueId: string): Promise<any[]> {
    const issueRes = await this.dataSource.query(
      `SELECT project_id as "projectId", status_id as "statusId" FROM issues WHERE id = $1 LIMIT 1`,
      [issueId],
    );
    if (issueRes.length === 0) {
      throw new NotFoundException('Issue not found');
    }
    const issue = issueRes[0];

    return this.dataSource.query(
      `SELECT wt.id, wt.name, 
              s.id as "toStatusId", s.name as "toStatusName", s.code as "toStatusCode", s.category as "toStatusCategory"
       FROM workflow_transitions wt
       JOIN statuses s ON s.id = wt.to_status_id
       WHERE wt.project_id = $1 AND wt.from_status_id = $2`,
      [issue.projectId, issue.statusId],
    );
  }

  /**
   * Perform status transition and record to issue history, executing automation rules
   */
  async transitionIssue(issueId: string, actorUserId: string, dto: TransitionIssueDto): Promise<any> {
    return this.dataSource.transaction(async (manager) => {
      const issueRes = await manager.query(
        `SELECT i.organization_id as "organizationId", i.project_id as "projectId", i.status_id as "statusId", i.assignee_id as "assigneeId",
                i.title, i.number, p.key as "projectKey"
         FROM issues i
         JOIN projects p ON p.id = i.project_id
         WHERE i.id = $1 LIMIT 1`,
        [issueId],
      );
      if (issueRes.length === 0) {
        throw new NotFoundException('Issue not found');
      }
      const issue = issueRes[0];

      // 2. Validate transition exists
      const transitionRes = await manager.query(
        `SELECT name FROM workflow_transitions
         WHERE project_id = $1 AND from_status_id = $2 AND to_status_id = $3 LIMIT 1`,
        [issue.projectId, issue.statusId, dto.toStatusId],
      );
      if (transitionRes.length === 0) {
        throw new BadRequestException({
          error: {
            code: 'INVALID_TRANSITION',
            message: 'This status transition is not allowed from the current state.',
          },
        });
      }
      const transitionName = transitionRes[0].name;

      // 3. Fetch status contexts (old and new)
      const oldStatusRes = await manager.query('SELECT name, code, category FROM statuses WHERE id = $1 LIMIT 1', [issue.statusId]);
      const newStatusRes = await manager.query('SELECT name, code, category, is_terminal as "isTerminal" FROM statuses WHERE id = $1 LIMIT 1', [dto.toStatusId]);
      const oldStatus = oldStatusRes[0];
      const newStatus = newStatusRes[0];

      // 4. Transition Validator Rule: Require assignee for active work
      if ((newStatus.category === 'ACTIVE' || newStatus.code === 'IN_PROGRESS') && !issue.assigneeId) {
        throw new BadRequestException({
          error: {
            code: 'ASSIGNEE_REQUIRED',
            message: 'Issues must have an assigned developer before starting work.',
          },
        });
      }

      // 5. Automate Resolution Dates
      let resolvedAt: Date | null = null;
      let closedAt: Date | null = null;

      if (newStatus.code === 'CLOSED' || newStatus.isTerminal) {
        resolvedAt = new Date();
        closedAt = new Date();
      } else if (newStatus.code === 'RESOLVED' || newStatus.category === 'DONE') {
        resolvedAt = new Date();
        closedAt = null;
      } else {
        // Transitioning out of DONE back to TODO or ACTIVE
        resolvedAt = null;
        closedAt = null;
      }

      // 6. Update Issue Status
      await manager.query(
        `UPDATE issues
         SET status_id = $1, resolved_at = $2, closed_at = $3, updated_at = now()
         WHERE id = $4`,
        [dto.toStatusId, resolvedAt, closedAt, issueId],
      );

      // 7. Write history log
      await manager.query(
        `INSERT INTO issue_history (organization_id, issue_id, actor_user_id, field_name, old_value, new_value, change_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          issue.organizationId,
          issueId,
          actorUserId,
          'status',
          JSON.stringify({ id: issue.statusId, name: oldStatus.name, code: oldStatus.code }),
          JSON.stringify({ id: dto.toStatusId, name: newStatus.name, code: newStatus.code }),
          'status_change',
        ],
      );

      // 8. If transition comment is provided, insert it
      if (dto.comment) {
        await manager.query(
          `INSERT INTO comments (organization_id, issue_id, author_id, body)
           VALUES ($1, $2, $3, $4)`,
          [
            issue.organizationId,
            issueId,
            actorUserId,
            `*Transitioned via "${transitionName}":*\n\n${dto.comment}`,
          ],
        );
      }

      // 9. Log Transactional Outbox Event
      await this.notificationService.logOutboxEvent(manager, issue.organizationId, 'issue_transitioned', {
        id: issueId,
        projectId: issue.projectId,
        projectKey: issue.projectKey,
        number: issue.number,
        title: issue.title,
        assigneeId: issue.assigneeId || null,
        fromStatus: oldStatus.code,
        toStatus: newStatus.code,
      });

      // 10. Evaluate and execute transition-based automation rules
      await this.automationService.executeRulesForTransition(
        manager,
        issue.organizationId,
        issue.projectId,
        issueId,
        actorUserId,
        dto.toStatusId,
      );

      // 11. Write audit log for status transition
      await this.auditService.logEvent(
        manager, issue.organizationId, issue.projectId, actorUserId,
        'issue', issueId, 'transitioned',
        { status: oldStatus.code }, { status: newStatus.code }, {},
      );

      return {
        issueId,
        fromStatus: oldStatus.code,
        toStatus: newStatus.code,
        resolvedAt,
        closedAt,
      };
    });
  }

  /**
   * Fetch issue status and field modification logs
   */
  async getIssueHistory(issueId: string): Promise<any[]> {
    return this.dataSource.query(
      `SELECT h.id, h.field_name as "fieldName", h.old_value as "oldValue", h.new_value as "newValue", 
              h.change_type as "changeType", h.created_at as "createdAt",
              u.display_name as "actorName", u.email as "actorEmail"
       FROM issue_history h
       LEFT JOIN users u ON u.id = h.actor_user_id
       WHERE h.issue_id = $1
       ORDER BY h.created_at DESC`,
      [issueId],
    );
  }
}
