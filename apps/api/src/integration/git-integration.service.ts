import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GitHubProvider } from './providers/github.provider';
import { GitLabProvider } from './providers/gitlab.provider';
import { GitProvider } from './providers/git-provider.interface';
import { GitWebhookEvent, CodeLinkDto } from '@forgetrack/contracts';

@Injectable()
export class GitIntegrationService {
  private readonly logger = new Logger(GitIntegrationService.name);
  private readonly providers: Map<string, GitProvider> = new Map();

  constructor(
    private readonly dataSource: DataSource,
    githubProvider: GitHubProvider,
    gitlabProvider: GitLabProvider,
  ) {
    this.providers.set('GITHUB', githubProvider);
    this.providers.set('GITLAB', gitlabProvider);
  }

  private getProvider(type: string): GitProvider {
    const provider = this.providers.get(type.toUpperCase());
    if (!provider) {
      throw new BadRequestException(`Unsupported Git provider: ${type}`);
    }
    return provider;
  }

  /**
   * Create or register a new Git integration
   */
  async createIntegration(
    orgId: string,
    projectId: string | null,
    userId: string,
    provider: string,
    config: Record<string, any>,
    secretReference?: string,
  ): Promise<any> {
    const gitProvider = this.getProvider(provider);
    const isValid = await gitProvider.validateConnection(config);
    const status = isValid ? 'ACTIVE' : 'ERROR';

    const res = await this.dataSource.query(
      `INSERT INTO integrations (organization_id, project_id, provider, status, configuration, secret_reference, created_by)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
       RETURNING id, organization_id as "organizationId", project_id as "projectId", provider, status, configuration, created_at as "createdAt"`,
      [orgId, projectId || null, provider.toUpperCase(), status, JSON.stringify(config), secretReference || null, userId],
    );
    this.logger.log(`Created integration ${res[0].id} for provider ${provider}`);
    return res[0];
  }

  /**
   * List integrations for organization
   */
  async listIntegrations(orgId: string): Promise<any[]> {
    return this.dataSource.query(
      `SELECT id, organization_id as "organizationId", project_id as "projectId",
              provider, status, configuration, secret_reference as "secretReference",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM integrations
       WHERE organization_id = $1
       ORDER BY created_at DESC`,
      [orgId],
    );
  }

  /**
   * Get single integration
   */
  async getIntegration(integrationId: string): Promise<any> {
    const res = await this.dataSource.query(
      `SELECT id, organization_id as "organizationId", project_id as "projectId",
              provider, status, configuration, secret_reference as "secretReference",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM integrations
       WHERE id = $1 LIMIT 1`,
      [integrationId],
    );
    if (res.length === 0) throw new NotFoundException('Integration not found');
    return res[0];
  }

  /**
   * Test integration connection
   */
  async testIntegration(integrationId: string): Promise<{ success: boolean; message: string }> {
    const integration = await this.getIntegration(integrationId);
    const gitProvider = this.getProvider(integration.provider);
    const success = await gitProvider.validateConnection(integration.configuration || {});

    const newStatus = success ? 'ACTIVE' : 'ERROR';
    await this.dataSource.query(`UPDATE integrations SET status = $1, updated_at = now() WHERE id = $2`, [newStatus, integrationId]);

    return {
      success,
      message: success ? 'Connection verified successfully' : 'Failed to establish connection with Git provider',
    };
  }

  /**
   * Update integration
   */
  async updateIntegration(integrationId: string, updates: Partial<{ configuration: any; status: string; secretReference: string }>): Promise<any> {
    const integration = await this.getIntegration(integrationId);
    const config = updates.configuration ? JSON.stringify(updates.configuration) : JSON.stringify(integration.configuration);
    const status = updates.status || integration.status;
    const secretRef = updates.secretReference !== undefined ? updates.secretReference : integration.secretReference;

    const res = await this.dataSource.query(
      `UPDATE integrations
       SET configuration = $1::jsonb, status = $2, secret_reference = $3, updated_at = now()
       WHERE id = $4
       RETURNING id, organization_id as "organizationId", project_id as "projectId", provider, status, configuration, updated_at as "updatedAt"`,
      [config, status, secretRef, integrationId],
    );
    return res[0];
  }

  /**
   * Delete integration
   */
  async deleteIntegration(integrationId: string): Promise<void> {
    const res = await this.dataSource.query(`DELETE FROM integrations WHERE id = $1 RETURNING id`, [integrationId]);
    if (res.length === 0) throw new NotFoundException('Integration not found');
  }

  /**
   * List repositories linked to an integration
   */
  async listRepositories(integrationId: string): Promise<any[]> {
    return this.dataSource.query(
      `SELECT id, integration_id as "integrationId", external_id as "externalId",
              owner, name, default_branch as "defaultBranch", web_url as "webUrl",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM repositories
       WHERE integration_id = $1
       ORDER BY name ASC`,
      [integrationId],
    );
  }

  /**
   * Sync repositories from provider to DB
   */
  async syncRepositories(integrationId: string): Promise<any[]> {
    const integration = await this.getIntegration(integrationId);
    const gitProvider = this.getProvider(integration.provider);
    const remoteRepos = await gitProvider.listRepositories(integration.configuration || {});

    const synced: any[] = [];
    for (const repo of remoteRepos) {
      const res = await this.dataSource.query(
        `INSERT INTO repositories (integration_id, external_id, owner, name, default_branch, web_url, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, now())
         ON CONFLICT (id) DO NOTHING
         RETURNING id, integration_id as "integrationId", owner, name, default_branch as "defaultBranch", web_url as "webUrl"`,
        [integrationId, repo.externalId, repo.owner, repo.name, repo.defaultBranch, repo.webUrl],
      );
      if (res.length > 0) {
        synced.push(res[0]);
      }
    }

    return this.listRepositories(integrationId);
  }

  /**
   * Extract Issue Keys from text strings (e.g. "Fixes PAY-102 and BUG-45" -> ["PAY-102", "BUG-45"])
   */
  extractIssueKeys(text: string): string[] {
    if (!text) return [];
    const regex = /\b([A-Z][A-Z0-9]{1,9})-(\d+)\b/g;
    const matches = new Set<string>();
    let m;
    while ((m = regex.exec(text)) !== null) {
      matches.add(`${m[1]}-${m[2]}`);
    }
    return Array.from(matches);
  }

  /**
   * Process Inbound Webhooks from Git Providers
   */
  async handleWebhook(integrationId: string, headers: Record<string, any>, payload: any): Promise<{ processed: boolean; eventsLinked: number }> {
    const integration = await this.getIntegration(integrationId);
    const gitProvider = this.getProvider(integration.provider);
    const secret = integration.secretReference || integration.configuration?.webhookSecret;

    const event: GitWebhookEvent | null = gitProvider.parseWebhook(headers, payload, secret);
    if (!event) {
      return { processed: false, eventsLinked: 0 };
    }

    // Find or create repository record
    let repositoryId: string | null = null;
    if (event.repository) {
      const repoRes = await this.dataSource.query(
        `SELECT id FROM repositories WHERE integration_id = $1 AND owner = $2 AND name = $3 LIMIT 1`,
        [integrationId, event.repository.owner, event.repository.name],
      );
      if (repoRes.length > 0) {
        repositoryId = repoRes[0].id;
      } else {
        const insertRes = await this.dataSource.query(
          `INSERT INTO repositories (integration_id, owner, name, default_branch, web_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [integrationId, event.repository.owner, event.repository.name, event.repository.defaultBranch || 'main', event.repository.url || null],
        );
        repositoryId = insertRes[0].id;
      }
    }

    let linkedCount = 0;

    // 1. Process Commits from Push
    if (event.commits && event.commits.length > 0) {
      for (const commit of event.commits) {
        const issueKeys = this.extractIssueKeys(commit.message);
        for (const key of issueKeys) {
          const linked = await this.linkCodeToIssue(key, repositoryId, 'COMMIT', commit.sha, commit.message, commit.url, {
            authorName: commit.authorName,
            authorEmail: commit.authorEmail,
            committedAt: commit.committedAt,
          });
          if (linked) linkedCount++;
        }
      }
    }

    // 2. Process Pull Requests
    if (event.pullRequest) {
      const pr = event.pullRequest;
      const combinedText = `${pr.title}\n${pr.body || ''}\n${pr.headBranch}`;
      const issueKeys = this.extractIssueKeys(combinedText);
      for (const key of issueKeys) {
        const linked = await this.linkCodeToIssue(key, repositoryId, 'PULL_REQUEST', String(pr.number), pr.title, pr.url, {
          state: pr.state,
          author: pr.author,
          headBranch: pr.headBranch,
          baseBranch: pr.baseBranch,
          mergedAt: pr.mergedAt,
        });
        if (linked) linkedCount++;
      }
    }

    // 3. Process Branch reference
    if (event.branchName) {
      const issueKeys = this.extractIssueKeys(event.branchName);
      for (const key of issueKeys) {
        const branchUrl = event.repository?.url ? `${event.repository.url}/tree/${event.branchName}` : '';
        const linked = await this.linkCodeToIssue(key, repositoryId, 'BRANCH', event.branchName, `Branch ${event.branchName}`, branchUrl, {
          branch: event.branchName,
        });
        if (linked) linkedCount++;
      }
    }

    return { processed: true, eventsLinked: linkedCount };
  }

  /**
   * Helper to link code entity (Commit/PR/Branch) to target issue
   */
  async linkCodeToIssue(
    issueKey: string,
    repositoryId: string | null,
    externalType: 'COMMIT' | 'PULL_REQUEST' | 'BRANCH' | 'CI_BUILD',
    externalId: string,
    title: string,
    url: string,
    metadata: Record<string, any> = {},
  ): Promise<boolean> {
    const parts = issueKey.split('-');
    if (parts.length !== 2) return false;
    const projectKey = parts[0];
    const issueNumber = parseInt(parts[1], 10);
    if (isNaN(issueNumber)) return false;

    // Find issue by project key and number
    const issueRes = await this.dataSource.query(
      `SELECT i.id, i.organization_id as "orgId", i.project_id as "projectId"
       FROM issues i
       JOIN projects p ON p.id = i.project_id
       WHERE p.key = $1 AND i.number = $2
       LIMIT 1`,
      [projectKey, issueNumber],
    );

    if (issueRes.length === 0) return false;
    const issueId = issueRes[0].id;

    // Insert or update code link
    await this.dataSource.query(
      `INSERT INTO code_links (issue_id, repository_id, external_type, external_id, title, url, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [issueId, repositoryId, externalType, externalId, title.substring(0, 500), url, JSON.stringify(metadata)],
    );

    return true;
  }

  /**
   * Get code links for an issue
   */
  async getCodeLinks(issueId: string): Promise<CodeLinkDto[]> {
    return this.dataSource.query(
      `SELECT cl.id, cl.issue_id as "issueId", cl.repository_id as "repositoryId",
              cl.external_type as "externalType", cl.external_id as "externalId",
              cl.title, cl.url, cl.metadata, cl.created_at as "createdAt",
              r.name as "repoName", r.owner as "repoOwner"
       FROM code_links cl
       LEFT JOIN repositories r ON r.id = cl.repository_id
       WHERE cl.issue_id = $1
       ORDER BY cl.created_at DESC`,
      [issueId],
    );
  }
}
