import * as crypto from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { GitProvider } from './git-provider.interface';
import { GitCommit, GitPullRequest, GitWebhookEvent } from '@forgetrack/contracts';

@Injectable()
export class GitHubProvider implements GitProvider {
  readonly providerType = 'GITHUB';
  private readonly logger = new Logger(GitHubProvider.name);

  async validateConnection(config: Record<string, any>): Promise<boolean> {
    const token = config.token || config.accessToken;
    if (!token && !config.mock) return false;
    if (config.mock) return true;

    try {
      const res = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `token ${token}`,
          'User-Agent': 'ForgeTrack-GitIntegration',
        },
      });
      return res.ok;
    } catch (err: any) {
      this.logger.warn(`GitHub connection validation error: ${err.message}`);
      return false;
    }
  }

  async listRepositories(config: Record<string, any>): Promise<Array<{ externalId: string; owner: string; name: string; defaultBranch: string; webUrl: string }>> {
    const token = config.token || config.accessToken;
    if (config.mock || !token) {
      return [
        {
          externalId: 'gh_101',
          owner: config.owner || 'acme',
          name: config.repo || 'core-engine',
          defaultBranch: 'main',
          webUrl: `https://github.com/${config.owner || 'acme'}/${config.repo || 'core-engine'}`,
        },
      ];
    }

    try {
      const res = await fetch('https://api.github.com/user/repos?per_page=100', {
        headers: {
          Authorization: `token ${token}`,
          'User-Agent': 'ForgeTrack-GitIntegration',
        },
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.map((r: any) => ({
        externalId: String(r.id),
        owner: r.owner.login,
        name: r.name,
        defaultBranch: r.default_branch || 'main',
        webUrl: r.html_url,
      }));
    } catch (err: any) {
      this.logger.error(`Failed to list GitHub repos: ${err.message}`);
      return [];
    }
  }

  async getPullRequest(config: Record<string, any>, repoOwner: string, repoName: string, prNumber: number): Promise<GitPullRequest | null> {
    const token = config.token || config.accessToken;
    if (config.mock || !token) {
      return {
        id: `gh_pr_${prNumber}`,
        number: prNumber,
        title: `PR #${prNumber}`,
        body: 'Automated description',
        state: 'open',
        headBranch: `feature/branch-${prNumber}`,
        baseBranch: 'main',
        url: `https://github.com/${repoOwner}/${repoName}/pull/${prNumber}`,
        author: 'developer',
        createdAt: new Date().toISOString(),
      };
    }

    try {
      const res = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/pulls/${prNumber}`, {
        headers: {
          Authorization: `token ${token}`,
          'User-Agent': 'ForgeTrack-GitIntegration',
        },
      });
      if (!res.ok) return null;
      const r = await res.json();
      return {
        id: String(r.id),
        number: r.number,
        title: r.title,
        body: r.body || '',
        state: r.merged ? 'merged' : r.state,
        headBranch: r.head.ref,
        baseBranch: r.base.ref,
        url: r.html_url,
        author: r.user?.login || 'unknown',
        createdAt: r.created_at,
        mergedAt: r.merged_at || undefined,
      };
    } catch (err: any) {
      this.logger.error(`Failed to fetch GitHub PR: ${err.message}`);
      return null;
    }
  }

  async getCommit(config: Record<string, any>, repoOwner: string, repoName: string, sha: string): Promise<GitCommit | null> {
    const token = config.token || config.accessToken;
    if (config.mock || !token) {
      return {
        sha,
        message: `Commit ${sha.substring(0, 7)}`,
        authorName: 'Developer',
        authorEmail: 'dev@example.com',
        url: `https://github.com/${repoOwner}/${repoName}/commit/${sha}`,
        committedAt: new Date().toISOString(),
      };
    }

    try {
      const res = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/commits/${sha}`, {
        headers: {
          Authorization: `token ${token}`,
          'User-Agent': 'ForgeTrack-GitIntegration',
        },
      });
      if (!res.ok) return null;
      const c = await res.json();
      return {
        sha: c.sha,
        message: c.commit.message,
        authorName: c.commit.author.name,
        authorEmail: c.commit.author.email,
        url: c.html_url,
        committedAt: c.commit.author.date,
      };
    } catch (err: any) {
      this.logger.error(`Failed to fetch GitHub commit: ${err.message}`);
      return null;
    }
  }

  async listBranches(config: Record<string, any>, repoOwner: string, repoName: string): Promise<string[]> {
    const token = config.token || config.accessToken;
    if (config.mock || !token) {
      return ['main', 'develop'];
    }

    try {
      const res = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/branches`, {
        headers: {
          Authorization: `token ${token}`,
          'User-Agent': 'ForgeTrack-GitIntegration',
        },
      });
      if (!res.ok) return [];
      const branches = await res.json();
      return branches.map((b: any) => b.name);
    } catch (err: any) {
      this.logger.error(`Failed to list GitHub branches: ${err.message}`);
      return [];
    }
  }

  parseWebhook(headers: Record<string, any>, payload: any, secret?: string): GitWebhookEvent | null {
    // 1. Verify HMAC if secret provided and header exists
    const signature = headers['x-hub-signature-256'] || headers['X-Hub-Signature-256'];
    if (secret && signature) {
      const rawPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawPayload).digest('hex')}`;
      const sigBuf = Buffer.from(signature, 'utf8');
      const expBuf = Buffer.from(expected, 'utf8');
      if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        this.logger.warn('GitHub webhook HMAC signature mismatch');
        return null;
      }
    }

    const eventName = headers['x-github-event'] || headers['X-GitHub-Event'];
    const body = typeof payload === 'string' ? JSON.parse(payload) : payload;

    if (eventName === 'ping') {
      return {
        event: 'ping',
        repository: {
          owner: body.repository?.owner?.login || 'unknown',
          name: body.repository?.name || 'unknown',
          url: body.repository?.html_url,
        },
      };
    }

    if (eventName === 'push') {
      const repo = body.repository || {};
      const commits: GitCommit[] = (body.commits || []).map((c: any) => ({
        sha: c.id || c.sha,
        message: c.message,
        authorName: c.author?.name || 'unknown',
        authorEmail: c.author?.email || '',
        url: c.url,
        committedAt: c.timestamp || new Date().toISOString(),
      }));

      const branchName = body.ref ? body.ref.replace('refs/heads/', '') : undefined;

      return {
        event: 'push',
        repository: {
          owner: repo.owner?.login || repo.owner?.name || 'unknown',
          name: repo.name || 'unknown',
          url: repo.html_url,
          defaultBranch: repo.default_branch || 'main',
        },
        commits,
        branchName,
        sender: body.sender?.login,
      };
    }

    if (eventName === 'pull_request') {
      const pr = body.pull_request || {};
      const repo = body.repository || {};

      let prState: 'open' | 'closed' | 'merged' = 'open';
      if (pr.merged) {
        prState = 'merged';
      } else if (pr.state === 'closed') {
        prState = 'closed';
      }

      return {
        event: 'pull_request',
        repository: {
          owner: repo.owner?.login || 'unknown',
          name: repo.name || 'unknown',
          url: repo.html_url,
          defaultBranch: repo.default_branch || 'main',
        },
        pullRequest: {
          id: String(pr.id),
          number: pr.number,
          title: pr.title,
          body: pr.body || '',
          state: prState,
          headBranch: pr.head?.ref || '',
          baseBranch: pr.base?.ref || '',
          url: pr.html_url,
          author: pr.user?.login || 'unknown',
          createdAt: pr.created_at,
          mergedAt: pr.merged_at || undefined,
        },
        sender: body.sender?.login,
      };
    }

    return null;
  }
}
