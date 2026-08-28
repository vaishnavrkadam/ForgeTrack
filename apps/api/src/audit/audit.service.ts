import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

@Injectable()
export class AuditService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Log an administrative or security event inside the active transaction manager
   */
  async logEvent(
    manager: EntityManager,
    orgId: string,
    projectId: string | null,
    actorUserId: string | null,
    entityType: string,
    entityId: string | null,
    action: string,
    beforeJson?: any,
    afterJson?: any,
    metadata?: any,
  ): Promise<void> {
    await manager.query(
      `INSERT INTO audit_events (
        organization_id, project_id, actor_user_id, entity_type, entity_id,
        action, before_json, after_json, metadata
       ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb)`,
      [
        orgId,
        projectId,
        actorUserId,
        entityType,
        entityId,
        action,
        beforeJson ? JSON.stringify(beforeJson) : null,
        afterJson ? JSON.stringify(afterJson) : null,
        metadata ? JSON.stringify(metadata) : '{}',
      ],
    );
  }

  /**
   * Search and filter organization audit trails
   */
  async searchTimeline(
    orgId: string,
    filters: {
      actorUserId?: string;
      entityType?: string;
      action?: string;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<any[]> {
    let query = `
      SELECT a.id, a.project_id as "projectId", a.actor_user_id as "actorUserId",
             a.entity_type as "entityType", a.entity_id as "entityId", a.action,
             a.before_json as "beforeJson", a.after_json as "afterJson", a.metadata,
             a.created_at as "createdAt", u.display_name as "actorName", u.email as "actorEmail"
      FROM audit_events a
      LEFT JOIN users u ON u.id = a.actor_user_id
      WHERE a.organization_id = $1
    `;
    const params: any[] = [orgId];

    if (filters.actorUserId) {
      params.push(filters.actorUserId);
      query += ` AND a.actor_user_id = $${params.length}`;
    }

    if (filters.entityType) {
      params.push(filters.entityType);
      query += ` AND a.entity_type = $${params.length}`;
    }

    if (filters.action) {
      params.push(filters.action);
      query += ` AND a.action = $${params.length}`;
    }

    if (filters.startDate) {
      params.push(filters.startDate);
      query += ` AND a.created_at >= $${params.length}`;
    }

    if (filters.endDate) {
      params.push(filters.endDate);
      query += ` AND a.created_at <= $${params.length}`;
    }

    query += ` ORDER BY a.created_at DESC LIMIT 100`;

    return this.dataSource.query(query, params);
  }
}
