import { SsrfValidator } from '../src/common/security/ssrf.validator';
import { WebhookService } from '../src/webhook/webhook.service';

describe('Phase 21 & Phase 22 — Webhooks & SSRF Security', () => {
  let webhookService: WebhookService;
  let mockDataSource: any;

  beforeEach(() => {
    mockDataSource = {
      query: jest.fn(),
    };
    webhookService = new WebhookService(mockDataSource as any);
  });

  describe('SSRF Validator', () => {
    it('should allow valid public HTTPS webhooks', () => {
      expect(SsrfValidator.validateUrl('https://api.example.com/webhook')).toBe(true);
      expect(SsrfValidator.validateUrl('https://hooks.slack.com/services/123/456')).toBe(true);
    });

    it('should block localhost and loopback targets', () => {
      expect(() => SsrfValidator.validateUrl('http://localhost:3000/hook')).toThrow(/blocked for security/);
      expect(() => SsrfValidator.validateUrl('http://127.0.0.1:8080/hook')).toThrow(/blocked for security/);
      expect(() => SsrfValidator.validateUrl('http://127.0.1.10/admin')).toThrow(/private network space/);
    });

    it('should block AWS & GCP cloud metadata endpoints', () => {
      expect(() => SsrfValidator.validateUrl('http://169.254.169.254/latest/meta-data')).toThrow(/blocked for security/);
      expect(() => SsrfValidator.validateUrl('http://metadata.google.internal/computeMetadata/v1')).toThrow(/blocked for security/);
    });

    it('should block RFC 1918 private subnets (10.x, 192.168.x, 172.16-31.x)', () => {
      expect(() => SsrfValidator.validateUrl('http://10.0.0.1/intranet')).toThrow(/private network space/);
      expect(() => SsrfValidator.validateUrl('http://192.168.1.1/router')).toThrow(/private network space/);
      expect(() => SsrfValidator.validateUrl('http://172.20.0.5:9000/db')).toThrow(/private network space/);
    });
  });

  describe('Webhook Dispatch & HMAC Signing', () => {
    it('should register webhook with SSRF validation', async () => {
      mockDataSource.query.mockResolvedValueOnce([
        {
          id: 'hook-1',
          organizationId: 'org-1',
          projectId: 'proj-1',
          url: 'https://webhook.site/test',
          events: ['issue.created'],
          isEnabled: true,
        },
      ]);

      const hook = await webhookService.createWebhook(
        'org-1',
        'proj-1',
        'user-1',
        'https://webhook.site/test',
        ['issue.created'],
        'secret-key',
      );

      expect(hook.id).toBe('hook-1');
      expect(hook.url).toBe('https://webhook.site/test');
      expect(mockDataSource.query).toHaveBeenCalledTimes(1);
    });

    it('should reject webhook creation targeting internal IPs', async () => {
      await expect(
        webhookService.createWebhook('org-1', 'proj-1', 'user-1', 'http://192.168.1.100/hook', ['*']),
      ).rejects.toThrow(/private network space/);
    });
  });
});
