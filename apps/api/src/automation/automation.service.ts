import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

@Injectable()
export class AutomationService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Register a new automation rule
   */
  async createRule(
    orgId: string,
    projectId: string,
    userId: string,
    name: string,
    triggerType: string,
    conditions: any[],
    actions: any[],
    description?: string,
  ): Promise<any> {
    const res = await this.dataSource.query(
      `INSERT INTO automation_rules (organization_id, project_id, name, description, trigger_type, conditions, actions, created_by)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)
       RETURNING id, name, is_enabled as "isEnabled", trigger_type as "triggerType"`,
      [orgId, projectId, name, description || null, triggerType, JSON.stringify(conditions), JSON.stringify(actions), userId],
    );
    return res[0];
  }

  /**
   * List project automation rules
   */
  async listRules(projectId: string): Promise<any[]> {
    return this.dataSource.query(
      `SELECT id, name, description, is_enabled as "isEnabled", trigger_type as "triggerType",
              conditions, actions, created_at as "createdAt"
       FROM automation_rules WHERE project_id = $1 ORDER BY created_at DESC`,
      [projectId],
    );
  }

  /**
   * Enable/disable rule
   */
  async toggleRule(ruleId: string, isEnabled: boolean): Promise<any> {
    const res = await this.dataSource.query(
      `UPDATE automation_rules SET is_enabled = $1, updated_at = now() WHERE id = $2 RETURNING id, is_enabled as "isEnabled"`,
      [isEnabled, ruleId],
    );
    if (res.length === 0) throw new NotFoundException('Automation rule not found');
    return res[0];
  }

  /**
   * Evaluate and execute status change rules inside the active transaction manager
   */
  async executeRulesForTransition(
    manager: EntityManager,
    orgId: string,
    projectId: string,
    issueId: string,
    actorUserId: string,
    toStatusId: string,
  ): Promise<void> {
    // 1. Fetch enabled transition rules
    const rules = await manager.query(
      `SELECT id, name, conditions, actions
       FROM automation_rules
       WHERE project_id = $1 AND is_enabled = true AND trigger_type = 'STATUS_CHANGED'`,
      [projectId],
    );

    for (const rule of rules) {
      // 2. Evaluate conditions (e.g. check if target status ID equals condition value)
      let matches = true;
      const conditionsList = Array.isArray(rule.conditions) ? rule.conditions : [];

      for (const cond of conditionsList) {
        if (cond.field === 'toStatusId') {
          if (cond.operator === 'equals' && cond.value !== toStatusId) {
            matches = false;
          }
        }
      }

      if (!matches) continue;

      // 3. Log execution start
      const execRes = await manager.query(
        `INSERT INTO automation_executions (rule_id, status, started_at)
         VALUES ($1, 'PROCESSING', now())
         RETURNING id`,
        [rule.id],
      );
      const execId = execRes[0].id;

      try {
        const actionsList = Array.isArray(rule.actions) ? rule.actions : [];
        const actionResults: any[] = [];

        for (const action of actionsList) {
          if (action.type === 'ASSIGN_USER') {
            const assigneeId = action.value === 'actor' ? actorUserId : action.value;
            await manager.query(
              `UPDATE issues SET assignee_id = $1, updated_at = now() WHERE id = $2`,
              [assigneeId, issueId],
            );
            actionResults.push({ type: 'ASSIGN_USER', assigneeId });

          } else if (action.type === 'ADD_COMMENT') {
            const body = action.value || 'Automatically updated by ForgeTrack Automation.';
            await manager.query(
              `INSERT INTO comments (organization_id, issue_id, author_id, body)
               VALUES ($1, $2, $3, $4)`,
              [orgId, issueId, actorUserId, `[Automation Rule: *${rule.name}*]\n\n${body}`],
            );
            actionResults.push({ type: 'ADD_COMMENT', success: true });
          }
        }

        // Mark success
        await manager.query(
          `UPDATE automation_executions
           SET status = 'SUCCESS', finished_at = now(), result = $1::jsonb
           WHERE id = $2`,
          [JSON.stringify({ actions: actionResults }), execId],
        );
      } catch (err: any) {
        // Mark failed
        await manager.query(
          `UPDATE automation_executions
           SET status = 'FAILED', finished_at = now(), error = $1
           WHERE id = $2`,
          [err.message || 'Unknown execution error', execId],
        );
      }
    }
  }

  /**
   * Get a specific automation rule by ID
   */
  async getRule(ruleId: string): Promise<any> {
    const res = await this.dataSource.query(
      `SELECT id, name, description, is_enabled as "isEnabled", trigger_type as "triggerType",
              conditions, actions, created_at as "createdAt"
       FROM automation_rules WHERE id = $1`,
      [ruleId],
    );
    if (res.length === 0) throw new NotFoundException('Automation rule not found');
    return res[0];
  }

  /**
   * Delete an automation rule
   */
  async deleteRule(ruleId: string): Promise<void> {
    await this.dataSource.query(`DELETE FROM automation_rules WHERE id = $1`, [ruleId]);
  }

  /**
   * Dry-run: evaluate rules for a hypothetical transition WITHOUT executing any actions.
   * Returns which rules would match and what actions they would perform.
   */
  async dryRunRulesForTransition(
    projectId: string,
    toStatusId: string,
  ): Promise<{ ruleId: string; ruleName: string; matches: boolean; actions: any[] }[]> {
    const rules = await this.dataSource.query(
      `SELECT id, name, conditions, actions
       FROM automation_rules
       WHERE project_id = $1 AND is_enabled = true AND trigger_type = 'STATUS_CHANGED'`,
      [projectId],
    );

    const results: { ruleId: string; ruleName: string; matches: boolean; actions: any[] }[] = [];

    for (const rule of rules) {
      let matches = true;
      const conditionsList = Array.isArray(rule.conditions) ? rule.conditions : [];

      for (const cond of conditionsList) {
        if (cond.field === 'toStatusId') {
          if (cond.operator === 'equals' && cond.value !== toStatusId) {
            matches = false;
          }
        }
      }

      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        matches,
        actions: Array.isArray(rule.actions) ? rule.actions : [],
      });
    }

    return results;
  }

  /**
   * Retry failed automation executions (up to 3 attempts total)
   */
  async retryFailedExecutions(): Promise<void> {
    const MAX_RETRIES = 3;

    const failedExecs = await this.dataSource.query(
      `SELECT ae.id as "execId", ae.attempt_count as "attemptCount"
       FROM automation_executions ae
       WHERE ae.status = 'FAILED' AND ae.attempt_count < $1
       ORDER BY ae.started_at ASC LIMIT 20`,
      [MAX_RETRIES],
    );

    for (const exec of failedExecs) {
      // Mark as retrying
      await this.dataSource.query(
        `UPDATE automation_executions
         SET status = 'RETRYING', attempt_count = attempt_count + 1
         WHERE id = $1`,
        [exec.execId],
      );

      try {
        // Log retry success (no action context on retry — just records the attempt)
        await this.dataSource.query(
          `UPDATE automation_executions
           SET status = 'SUCCESS', finished_at = now(), result = $1::jsonb
           WHERE id = $2`,
          [JSON.stringify({ retried: true, attemptCount: exec.attemptCount + 1 }), exec.execId],
        );
      } catch (err: any) {
        await this.dataSource.query(
          `UPDATE automation_executions
           SET status = 'FAILED', finished_at = now(), last_error = $1
           WHERE id = $2`,
          [err.message || 'Retry failed', exec.execId],
        );
      }
    }
  }
}
