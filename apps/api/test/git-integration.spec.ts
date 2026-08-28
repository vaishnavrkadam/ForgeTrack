import { GitHubProvider } from '../src/integration/providers/github.provider';
import { GitLabProvider } from '../src/integration/providers/gitlab.provider';
import { GitIntegrationService } from '../src/integration/git-integration.service';
import * as crypto from 'crypto';

describe('Phase 15 — Git Integrations', () => {
  let githubProvider: GitHubProvider;
  let gitlabProvider: GitLabProvider;
  let gitIntegrationService: GitIntegrationService;
  let mockDataSource: any;

  beforeEach(() => {
    githubProvider = new GitHubProvider();
    gitlabProvider = new GitLabProvider();
    mockDataSource = {
      query: jest.fn(),
    };
    gitIntegrationService = new GitIntegrationService(
      mockDataSource as any,
      githubProvider,
      gitlabProvider,
    );
  });

  describe('GitHubProvider', () => {
    it('should validate connection in mock mode', async () => {
      const valid = await githubProvider.validateConnection({ mock: true });
      expect(valid).toBe(true);
    });

    it('should list repositories in mock mode', async () => {
      const repos = await githubProvider.listRepositories({ mock: true, owner: 'acme', repo: 'backend' });
      expect(repos).toHaveLength(1);
      expect(repos[0].name).toBe('backend');
      expect(repos[0].owner).toBe('acme');
    });

    it('should parse push webhook with commits', () => {
      const headers = { 'x-github-event': 'push' };
      const payload = {
        ref: 'refs/heads/feature/login',
        repository: { name: 'backend', owner: { login: 'acme' }, html_url: 'https://github.com/acme/backend' },
        commits: [
          { id: 'c1234567', message: 'fix(auth): resolve session bug fixes PAY-101', author: { name: 'Alice', email: 'alice@example.com' }, url: 'https://github.com/acme/backend/commit/c1234567' },
        ],
        sender: { login: 'alice' },
      };

      const event = githubProvider.parseWebhook(headers, payload);
      expect(event).toBeDefined();
      expect(event?.event).toBe('push');
      expect(event?.branchName).toBe('feature/login');
      expect(event?.commits).toHaveLength(1);
      expect(event?.commits?.[0].sha).toBe('c1234567');
    });

    it('should verify HMAC signature if secret is provided', () => {
      const secret = 'webhook-secret-123';
      const payload = JSON.stringify({ ref: 'refs/heads/main', repository: { name: 'core' } });
      const signature = `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;
      const headers = { 'x-github-event': 'push', 'x-hub-signature-256': signature };

      const event = githubProvider.parseWebhook(headers, payload, secret);
      expect(event).toBeDefined();
      expect(event?.event).toBe('push');
    });

    it('should reject invalid HMAC signature', () => {
      const secret = 'webhook-secret-123';
      const payload = JSON.stringify({ ref: 'refs/heads/main' });
      const headers = { 'x-github-event': 'push', 'x-hub-signature-256': 'sha256=invalid-signature' };

      const event = githubProvider.parseWebhook(headers, payload, secret);
      expect(event).toBeNull();
    });

    it('should parse pull_request webhook', () => {
      const headers = { 'x-github-event': 'pull_request' };
      const payload = {
        repository: { name: 'api', owner: { login: 'acme' } },
        pull_request: {
          id: 42,
          number: 10,
          title: 'Implement OAuth support for PAY-50',
          body: 'Closes PAY-50 and fixes BUG-12',
          state: 'open',
          head: { ref: 'feat/oauth' },
          base: { ref: 'main' },
          html_url: 'https://github.com/acme/api/pull/10',
          user: { login: 'bob' },
          created_at: '2026-08-28T00:00:00Z',
        },
      };

      const event = githubProvider.parseWebhook(headers, payload);
      expect(event).toBeDefined();
      expect(event?.event).toBe('pull_request');
      expect(event?.pullRequest?.title).toBe('Implement OAuth support for PAY-50');
      expect(event?.pullRequest?.headBranch).toBe('feat/oauth');
    });
  });

  describe('GitLabProvider', () => {
    it('should parse push webhook payload', () => {
      const headers = { 'x-gitlab-event': 'Push Hook' };
      const payload = {
        object_kind: 'push',
        ref: 'refs/heads/main',
        project: { name: 'pipeline', namespace: 'acme-group', web_url: 'https://gitlab.com/acme-group/pipeline' },
        commits: [
          { id: 'abc987', message: 'feat: add metrics support for PROJ-42', author_name: 'Charlie', author_email: 'charlie@acme.com', url: 'https://gitlab.com/commit/abc987' },
        ],
      };

      const event = gitlabProvider.parseWebhook(headers, payload);
      expect(event).toBeDefined();
      expect(event?.event).toBe('push');
      expect(event?.commits).toHaveLength(1);
      expect(event?.commits?.[0].sha).toBe('abc987');
    });
  });

  describe('GitIntegrationService - Key Extraction & Linking', () => {
    it('should correctly extract issue keys from multi-pattern text', () => {
      const text = 'feat(auth): fixes PAY-101, closes BUG-42 and addresses PROJ-9999 [RELEASE-1]';
      const keys = gitIntegrationService.extractIssueKeys(text);
      expect(keys).toEqual(expect.arrayContaining(['PAY-101', 'BUG-42', 'PROJ-9999', 'RELEASE-1']));
    });

    it('should return empty array for text with no issue keys', () => {
      const text = 'Updated readme and fixed typographical issues';
      const keys = gitIntegrationService.extractIssueKeys(text);
      expect(keys).toEqual([]);
    });

    it('should link commit to issue in database', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ id: 'issue-uuid-101', orgId: 'org-1', projectId: 'proj-1' }]) // select issue
        .mockResolvedValueOnce([]); // insert code_link

      const linked = await gitIntegrationService.linkCodeToIssue(
        'PAY-101',
        'repo-uuid-1',
        'COMMIT',
        'sha-abc',
        'feat: initial commit',
        'https://github.com/acme/backend/commit/sha-abc',
        { author: 'Alice' },
      );

      expect(linked).toBe(true);
      expect(mockDataSource.query).toHaveBeenCalledTimes(2);
    });
  });
});
