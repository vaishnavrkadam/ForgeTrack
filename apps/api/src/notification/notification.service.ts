import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AiService } from '../ai/ai.service';

@Injectable()
export class NotificationService {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => AiService))
    private readonly aiService: AiService,
  ) {}

  /**
   * Write an event log to outbox_events table within the active transaction manager
   */
  async logOutboxEvent(manager: EntityManager, orgId: string, eventType: string, payload: any): Promise<void> {
    await manager.query(
      `INSERT INTO outbox_events (organization_id, event_type, payload)
       VALUES ($1, $2, $3::jsonb)`,
      [orgId, eventType, JSON.stringify(payload)],
    );
  }

  /**
   * Retrieve active alerts for a user
   */
  async listNotifications(userId: string): Promise<any[]> {
    return this.dataSource.query(
      `SELECT id, organization_id as "organizationId", type, title, body, is_read as "isRead", created_at as "createdAt"
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 50`,
      [userId],
    );
  }

  /**
   * Mark alert as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
      [notificationId, userId],
    );
  }

  // Webhook Management
  async registerWebhook(projectId: string, orgId: string, url: string, secret?: string): Promise<any> {
    const res = await this.dataSource.query(
      `INSERT INTO webhooks (project_id, organization_id, url, secret)
       VALUES ($1, $2, $3, $4)
       RETURNING id, url, is_active as "isActive"`,
      [projectId, orgId, url, secret || null],
    );
    return res[0];
  }

  async listWebhooks(projectId: string): Promise<any[]> {
    return this.dataSource.query(
      `SELECT id, url, is_active as "isActive", created_at as "createdAt"
       FROM webhooks WHERE project_id = $1 ORDER BY created_at DESC`,
      [projectId],
    );
  }

  /**
   * Cron-poller logic executing every 10 seconds in background
   */
  async processOutboxEvents(): Promise<void> {
    const events = await this.dataSource.query(
      `SELECT id, organization_id as "organizationId", event_type as "eventType", payload
       FROM outbox_events
       WHERE processed_at IS NULL
       ORDER BY created_at ASC LIMIT 10`,
    );

    if (events.length === 0) return;

    for (const event of events) {
      await this.dataSource.transaction(async (manager) => {
        // 1. Instantly mark processed to prevent double processing in case of errors
        await manager.query(
          `UPDATE outbox_events SET processed_at = now() WHERE id = $1`,
          [event.id],
        );

        const payload = event.payload;
        const orgId = event.organizationId;
        const type = event.eventType;

        if (type === 'issue_created') {
          const { title, projectKey, number, assigneeId } = payload;
          const label = `${projectKey}-${number}`;

          if (assigneeId) {
            // Deduplication guard: skip if same notification was sent in the last 5 minutes
            const notifBody = `You have been assigned issue ${label}: "${title}"`;
            const isDup = await this.isDuplicateNotification(orgId, assigneeId, 'issue_assigned', notifBody);
            if (!isDup) {
              await manager.query(
                `INSERT INTO notifications (organization_id, user_id, type, title, body)
                 VALUES ($1, $2, 'issue_assigned', $3, $4)`,
                [orgId, assigneeId, 'Issue Assigned', notifBody],
              );
            }

            // Log mock email dispatch
            console.log(`[SMTP Notification Engine] Sending email to assignee user ID ${assigneeId} -- Subject: Assigned to ${label} -- Body: You are assigned to "${title}"`);
          }

          // Trigger Webhooks
          await this.dispatchWebhooks(manager, orgId, payload.projectId, type, payload);

          // Update AI Search vector embeddings asynchronously
          await this.aiService.updateIssueEmbedding(payload.id);

        } else if (type === 'issue_transitioned') {
          const { title, projectKey, number, assigneeId, fromStatus, toStatus } = payload;
          const label = `${projectKey}-${number}`;

          if (assigneeId) {
            await manager.query(
              `INSERT INTO notifications (organization_id, user_id, type, title, body)
               VALUES ($1, $2, 'issue_status_changed', $3, $4)`,
              [
                orgId,
                assigneeId,
                'Issue Transitioned',
                `Assigned issue ${label} transitioned from ${fromStatus} to ${toStatus}`,
              ],
            );

            console.log(`[SMTP Notification Engine] Sending email to assignee user ID ${assigneeId} -- Subject: ${label} status changed -- Body: "${title}" moved to ${toStatus}`);
          }

          await this.dispatchWebhooks(manager, orgId, payload.projectId, type, payload);

          // Update AI Search vector embeddings on status change
          await this.aiService.updateIssueEmbedding(payload.id);

        } else if (type === 'comment_created') {
          const { issueId, authorId, mentions, bodyText } = payload;
          
          // Retrieve issue watchers
          const watchers = await manager.query(
            `SELECT user_id as "userId" FROM watchers WHERE issue_id = $1`,
            [issueId],
          );
          
          // Alert watchers (excluding the comment author)
          for (const w of watchers) {
            if (w.userId !== authorId) {
              await manager.query(
                `INSERT INTO notifications (organization_id, user_id, type, title, body)
                 VALUES ($1, $2, 'comment_added', 'New Comment Added', $3)`,
                [orgId, w.userId, `A comment was posted: "${bodyText}"`],
              );
              console.log(`[SMTP Notification Engine] Sending email to watcher user ID ${w.userId} -- Subject: New comment posted -- Body: "${bodyText}"`);
            }
          }

          // Alert mentioned users
          if (Array.isArray(mentions) && mentions.length > 0) {
            for (const username of mentions) {
              const users = await manager.query(
                `SELECT id, email FROM users WHERE display_name = $1 OR email = $1 LIMIT 1`,
                [username],
              );
              if (users.length > 0) {
                const mentionedUser = users[0];
                if (mentionedUser.id !== authorId) {
                  await manager.query(
                    `INSERT INTO notifications (organization_id, user_id, type, title, body)
                     VALUES ($1, $2, 'comment_mention', 'Mentioned in Comment', $3)`,
                    [orgId, mentionedUser.id, `You were mentioned in a comment: "${bodyText}"`],
                  );
                  console.log(`[SMTP Notification Engine] Sending email to mentioned user ${mentionedUser.email} -- Subject: Mentioned in comment -- Body: You were mentioned.`);
                }
              }
            }
          }
        }
      });
    }
  }

  /**
   * Get notification preferences for a user in an org
   */
  async getPreferences(orgId: string, userId: string): Promise<any[]> {
    return this.dataSource.query(
      `SELECT event_type as "eventType", in_app as "inApp", email
       FROM notification_preferences
       WHERE organization_id = $1 AND user_id = $2`,
      [orgId, userId],
    );
  }

  /**
   * Upsert a notification preference
   */
  async upsertPreference(orgId: string, userId: string, eventType: string, inApp: boolean, email: boolean): Promise<any> {
    const res = await this.dataSource.query(
      `INSERT INTO notification_preferences (organization_id, user_id, event_type, in_app, email)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (organization_id, user_id, event_type)
       DO UPDATE SET in_app = EXCLUDED.in_app, email = EXCLUDED.email
       RETURNING event_type as "eventType", in_app as "inApp", email`,
      [orgId, userId, eventType, inApp, email],
    );
    return res[0];
  }

  /**
   * Deduplication guard: returns true if same notification was already sent in last 5 minutes
   */
  async isDuplicateNotification(orgId: string, userId: string, type: string, body: string): Promise<boolean> {
    const res = await this.dataSource.query(
      `SELECT id FROM notifications
       WHERE organization_id = $1 AND user_id = $2 AND type = $3 AND body = $4
       AND created_at > now() - INTERVAL '5 minutes'
       LIMIT 1`,
      [orgId, userId, type, body],
    );
    return res.length > 0;
  }

  /**
   * Helper to dispatch webhooks and log delivery reports
   */
  private async dispatchWebhooks(manager: EntityManager, orgId: string, projectId: string, type: string, payload: any): Promise<void> {
    const webhooks = await manager.query(
      `SELECT id, url, secret FROM webhooks WHERE project_id = $1 AND is_active = true`,
      [projectId],
    );

    for (const wh of webhooks) {
      console.log(`[Webhook Dispatcher] Sending event "${type}" to URL: ${wh.url}`);

      // Save webhook delivery audit record
      await manager.query(
        `INSERT INTO webhook_deliveries (organization_id, webhook_id, event_type, payload, response_status, response_body)
         VALUES ($1, $2, $3, $4::jsonb, 200, '{"success": true, "mocked": true}')`,
        [orgId, wh.id, type, JSON.stringify(payload)],
      );
    }
  }
}
