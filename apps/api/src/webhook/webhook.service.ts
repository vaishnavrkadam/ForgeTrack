import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { SsrfValidator } from '../common/security/ssrf.validator';
import { WebhookDto, WebhookDeliveryDto, OutboundWebhookPayload } from '@forgetrack/contracts';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Register a new outbound webhook
   */
  async createWebhook(
    orgId: string,
    projectId: string | null,
    userId: string,
    url: string,
    events: string[],
    secret?: string,
  ): Promise<WebhookDto> {
    SsrfValidator.validateUrl(url);

    if (!Array.isArray(events) || events.length === 0) {
      throw new BadRequestException('At least one subscribed event is required');
    }

    const webhookSecret = secret || crypto.randomBytes(24).toString('hex');

    const res = await this.dataSource.query(
      `INSERT INTO webhooks (organization_id, project_id, url, secret_reference, events, is_enabled, created_by)
       VALUES ($1, $2, $3, $4, $5::jsonb, true, $6)
       RETURNING id, organization_id as "organizationId", project_id as "projectId",
                 url, events, is_enabled as "isEnabled", created_at as "createdAt", updated_at as "updatedAt"`,
      [orgId, projectId || null, url, webhookSecret, JSON.stringify(events), userId],
    );

    this.logger.log(`Created webhook ${res[0].id} targeting ${url}`);
    return res[0];
  }

  /**
   * List webhooks for a project or organization
   */
  async listWebhooks(projectId: string): Promise<WebhookDto[]> {
    return this.dataSource.query(
      `SELECT id, organization_id as "organizationId", project_id as "projectId",
              url, events, is_enabled as "isEnabled", created_at as "createdAt", updated_at as "updatedAt"
       FROM webhooks
       WHERE project_id = $1
       ORDER BY created_at DESC`,
      [projectId],
    );
  }

  /**
   * Get single webhook
   */
  async getWebhook(webhookId: string): Promise<any> {
    const res = await this.dataSource.query(
      `SELECT id, organization_id as "organizationId", project_id as "projectId",
              url, events, is_enabled as "isEnabled", secret_reference as "secretReference",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM webhooks WHERE id = $1 LIMIT 1`,
      [webhookId],
    );
    if (res.length === 0) throw new NotFoundException('Webhook not found');
    return res[0];
  }

  /**
   * Update webhook
   */
  async updateWebhook(webhookId: string, updates: Partial<{ url: string; events: string[]; isEnabled: boolean; secret: string }>): Promise<WebhookDto> {
    const webhook = await this.getWebhook(webhookId);
    if (updates.url) {
      SsrfValidator.validateUrl(updates.url);
    }

    const url = updates.url || webhook.url;
    const events = updates.events ? JSON.stringify(updates.events) : JSON.stringify(webhook.events);
    const isEnabled = updates.isEnabled !== undefined ? updates.isEnabled : webhook.isEnabled;
    const secret = updates.secret || webhook.secretReference;

    const res = await this.dataSource.query(
      `UPDATE webhooks
       SET url = $1, events = $2::jsonb, is_enabled = $3, secret_reference = $4, updated_at = now()
       WHERE id = $5
       RETURNING id, organization_id as "organizationId", project_id as "projectId",
                 url, events, is_enabled as "isEnabled", created_at as "createdAt", updated_at as "updatedAt"`,
      [url, events, isEnabled, secret, webhookId],
    );

    return res[0];
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    const res = await this.dataSource.query(`DELETE FROM webhooks WHERE id = $1 RETURNING id`, [webhookId]);
    if (res.length === 0) throw new NotFoundException('Webhook not found');
  }

  /**
   * Dispatch an outbound event to all matching webhooks
   */
  async dispatchEvent(orgId: string, projectId: string | null, eventType: string, payloadData: Record<string, any>): Promise<number> {
    let whereClause = `WHERE organization_id = $1 AND is_enabled = true`;
    const params: any[] = [orgId];

    if (projectId) {
      params.push(projectId);
      whereClause += ` AND (project_id = $2 OR project_id IS NULL)`;
    }

    const webhooks = await this.dataSource.query(
      `SELECT id, url, secret_reference as "secret", events FROM webhooks ${whereClause}`,
      params,
    );

    let dispatchedCount = 0;

    for (const hook of webhooks) {
      const events: string[] = Array.isArray(hook.events) ? hook.events : [];
      if (events.includes('*') || events.includes(eventType)) {
        dispatchedCount++;
        const payload: OutboundWebhookPayload = {
          id: crypto.randomUUID(),
          event: eventType,
          occurredAt: new Date().toISOString(),
          data: payloadData,
        };

        // Asynchronously deliver webhook
        setImmediate(() => this.executeDelivery(hook.id, hook.url, hook.secret, payload));
      }
    }

    return dispatchedCount;
  }

  /**
   * Execute webhook delivery attempt with HMAC signature and backoff logic
   */
  async executeDelivery(
    webhookId: string,
    targetUrl: string,
    secret: string,
    payload: OutboundWebhookPayload,
    attemptCount: number = 1,
  ): Promise<WebhookDeliveryDto> {
    const rawPayload = JSON.stringify(payload);
    const timestamp = Date.now().toString();
    const signature = crypto
      .createHmac('sha256', secret || 'default-secret')
      .update(`${timestamp}.${rawPayload}`)
      .digest('hex');

    // Create initial delivery record
    const deliveryRes = await this.dataSource.query(
      `INSERT INTO webhook_deliveries (webhook_id, event_id, attempt_count, status)
       VALUES ($1, $2, $3, 'PENDING')
       RETURNING id, webhook_id as "webhookId", event_id as "eventId", attempt_count as "attemptCount", status, created_at as "createdAt"`,
      [webhookId, payload.id, attemptCount],
    );
    const deliveryId = deliveryRes[0].id;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ForgeTrack-Webhooks/1.0',
          'X-ForgeTrack-Event': payload.event,
          'X-ForgeTrack-Delivery': deliveryId,
          'X-ForgeTrack-Timestamp': timestamp,
          'X-ForgeTrack-Signature': `t=${timestamp},v1=${signature}`,
        },
        body: rawPayload,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseBody = await response.text();
      const isSuccess = response.status >= 200 && response.status < 300;
      const finalStatus = isSuccess ? 'SUCCESS' : (attemptCount >= 3 ? 'FAILED' : 'RETRY');

      // Calculate exponential backoff next attempt if retryable
      const nextAttemptAt = finalStatus === 'RETRY' ? new Date(Date.now() + Math.pow(2, attemptCount) * 15000) : null;

      const updated = await this.dataSource.query(
        `UPDATE webhook_deliveries
         SET status = $1, response_status = $2, response_body = $3,
             next_attempt_at = $4, delivered_at = now()
         WHERE id = $5
         RETURNING id, webhook_id as "webhookId", event_id as "eventId",
                   attempt_count as "attemptCount", status, response_status as "responseStatus",
                   response_body as "responseBody", next_attempt_at as "nextAttemptAt",
                   delivered_at as "deliveredAt", created_at as "createdAt"`,
        [finalStatus, response.status, responseBody.substring(0, 1000), nextAttemptAt, deliveryId],
      );

      this.logger.log(`Webhook delivery ${deliveryId} status: ${finalStatus} (HTTP ${response.status})`);
      return updated[0];
    } catch (err: any) {
      const finalStatus = attemptCount >= 3 ? 'FAILED' : 'RETRY';
      const nextAttemptAt = finalStatus === 'RETRY' ? new Date(Date.now() + Math.pow(2, attemptCount) * 15000) : null;

      const updated = await this.dataSource.query(
        `UPDATE webhook_deliveries
         SET status = $1, response_body = $2, next_attempt_at = $3
         WHERE id = $4
         RETURNING id, webhook_id as "webhookId", event_id as "eventId",
                   attempt_count as "attemptCount", status, response_status as "responseStatus",
                   response_body as "responseBody", next_attempt_at as "nextAttemptAt",
                   delivered_at as "deliveredAt", created_at as "createdAt"`,
        [finalStatus, `Network Error: ${err.message}`, nextAttemptAt, deliveryId],
      );

      this.logger.warn(`Webhook delivery ${deliveryId} failed attempt ${attemptCount}: ${err.message}`);
      return updated[0];
    }
  }

  /**
   * Retry a failed webhook delivery
   */
  async retryDelivery(deliveryId: string): Promise<WebhookDeliveryDto> {
    const res = await this.dataSource.query(
      `SELECT d.id, d.webhook_id as "webhookId", d.event_id as "eventId", d.attempt_count as "attemptCount",
              w.url, w.secret_reference as "secret"
       FROM webhook_deliveries d
       JOIN webhooks w ON w.id = d.webhook_id
       WHERE d.id = $1 LIMIT 1`,
      [deliveryId],
    );
    if (res.length === 0) throw new NotFoundException('Webhook delivery not found');

    const item = res[0];
    const payload: OutboundWebhookPayload = {
      id: item.eventId || crypto.randomUUID(),
      event: 'retry.event',
      occurredAt: new Date().toISOString(),
      data: { manualRetry: true, deliveryId },
    };

    return this.executeDelivery(item.webhookId, item.url, item.secret, payload, item.attemptCount + 1);
  }

  /**
   * List delivery history for a webhook
   */
  async listDeliveries(webhookId: string, limit: number = 50): Promise<WebhookDeliveryDto[]> {
    return this.dataSource.query(
      `SELECT id, webhook_id as "webhookId", event_id as "eventId",
              attempt_count as "attemptCount", status, response_status as "responseStatus",
              response_body as "responseBody", next_attempt_at as "nextAttemptAt",
              delivered_at as "deliveredAt", created_at as "createdAt"
       FROM webhook_deliveries
       WHERE webhook_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [webhookId, limit],
    );
  }

  /**
   * Test webhook endpoint by sending a test ping
   */
  async testWebhook(webhookId: string): Promise<WebhookDeliveryDto> {
    const hook = await this.getWebhook(webhookId);
    const payload: OutboundWebhookPayload = {
      id: crypto.randomUUID(),
      event: 'ping',
      occurredAt: new Date().toISOString(),
      data: { test: true, message: 'ForgeTrack outbound webhook test ping' },
    };

    return this.executeDelivery(webhookId, hook.url, hook.secretReference, payload, 1);
  }
}
