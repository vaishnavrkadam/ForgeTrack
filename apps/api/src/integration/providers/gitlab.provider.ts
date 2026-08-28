import * as crypto from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { GitProvider } from './git-provider.interface';
import { GitCommit, GitPullRequest, GitWebhookEvent } from '@forgetrack/contracts';

@Injectable()
export class GitLabProvider implements GitProvider {
  readonly providerType = 'GITLAB';
  private readonly logger = new Logger(GitLabProvider.name);

  async validateConnection(config: Record<string, any>): Promise<boolean> {
    const token = config.token || config.privateToken;
    const host = config.host || 'https://gitlab.com';
    if (!token && !config.mock) return false;
    if (config.mock) return true;

    try {
      const res = await fetch(`${host}/api/v4/user`, {
        headers: { 'PRIVATE-TOKEN': token },
      });
      return res.ok;
    } catch (err: any) {
      this.logger.warn(`GitLab connection validation error: ${err.message}`);
      return false;
    }
  }

  async listRepositories(config: Record<string, any>): Promise<Array<{ externalId: string; owner: string; name: string; defaultBranch: string; webUrl: string }>> {
    const token = config.token || config.privateToken;
    const host = config.host || 'https://gitlab.com';
    if (config.mock || !token) {
      return [
        {
          externalId: 'gl_201',
          owner: config.owner || 'acme-group',
          name: config.repo || 'infra-pipeline',
          defaultBranch: 'main',
          webUrl: `${host}/${config.owner || 'acme-group'}/${config.repo || 'infra-pipeline'}`,
        },
      ];
    }

    try {
      const res = await fetch(`${host}/api/v4/projects?membership=true&per_page=100`, {
        headers: { 'PRIVATE-TOKEN': token },
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.map((p: any) => ({
        externalId: String(p.id),
        owner: p.namespace?.path || 'unknown',
        name: p.path || p.name,
        defaultBranch: p.default_branch || 'main',
        webUrl: p.web_url,
      }));
    } catch (err: any) {
      this.logger.error(`Failed to list GitLab repos: ${err.message}`);
      return [];
    }
  }

  async getPullRequest(config: Record<string, any>, repoOwner: string, repoName: string, prNumber: number): Promise<GitPullRequest | null> {
    const token = config.token || config.privateToken;
    const host = config.host || 'https://gitlab.com';
    const projectId = encodeURIComponent(`${repoOwner}/${repoName}`);

    if (config.mock || !token) {
      return {
        id: `gl_mr_${prNumber}`,
        number: prNumber,
        title: `MR !${prNumber}`,
        body: 'GitLab Merge Request',
        state: 'open',
        headBranch: `feature/mr-${prNumber}`,
        baseBranch: 'main',
        url: `${host}/${repoOwner}/${repoName}/-/merge_requests/${prNumber}`,
        author: 'developer',
        createdAt: new Date().toISOString(),
      };
    }

    try {
      const res = await fetch(`${host}/api/v4/projects/${projectId}/merge_requests/${prNumber}`, {
        headers: { 'PRIVATE-TOKEN': token },
      });
      if (!res.ok) return null;
      const mr = await res.json();
      let state: 'open' | 'closed' | 'merged' = 'open';
      if (mr.state === 'merged') state = 'merged';
      else if (mr.state === 'closed') state = 'closed';

      return {
        id: String(mr.id),
        number: mr.iid,
        title: mr.title,
        body: mr.description || '',
        state,
        headBranch: mr.source_branch,
        baseBranch: mr.target_branch,
        url: mr.web_url,
        author: mr.author?.username || 'unknown',
        createdAt: mr.created_at,
        mergedAt: mr.merged_at || undefined,
      };
    } catch (err: any) {
      this.logger.error(`Failed to fetch GitLab MR: ${err.message}`);
      return null;
    }
  }

  async getCommit(config: Record<string, any>, repoOwner: string, repoName: string, sha: string): Promise<GitCommit | null> {
    const token = config.token || config.privateToken;
    const host = config.host || 'https://gitlab.com';
    const projectId = encodeURIComponent(`${repoOwner}/${repoName}`);

    if (config.mock || !token) {
      return {
        sha,
        message: `Commit ${sha.substring(0, 7)}`,
        authorName: 'Developer',
        authorEmail: 'dev@example.com',
        url: `${host}/${repoOwner}/${repoName}/-/commit/${sha}`,
        committedAt: new Date().toISOString(),
      };
    }

    try {
      const res = await fetch(`${host}/api/v4/projects/${projectId}/repository/commits/${sha}`, {
        headers: { 'PRIVATE-TOKEN': token },
      });
      if (!res.ok) return null;
      const c = await res.json();
      return {
        sha: c.id,
        message: c.message,
        authorName: c.author_name,
        authorEmail: c.author_email,
        url: c.web_url,
        committedAt: c.committed_date,
      };
    } catch (err: any) {
      this.logger.error(`Failed to fetch GitLab commit: ${err.message}`);
      return null;
    }
  }

  async listBranches(config: Record<string, any>, repoOwner: string, repoName: string): Promise<string[]> {
    const token = config.token || config.privateToken;
    const host = config.host || 'https://gitlab.com';
    const projectId = encodeURIComponent(`${repoOwner}/${repoName}`);

    if (config.mock || !token) {
      return ['main', 'staging'];
    }

    try {
      const res = await fetch(`${host}/api/v4/projects/${projectId}/repository/branches`, {
        headers: { 'PRIVATE-TOKEN': token },
      });
      if (!res.ok) return [];
      const branches = await res.json();
      return branches.map((b: any) => b.name);
    } catch (err: any) {
      this.logger.error(`Failed to list GitLab branches: ${err.message}`);
      return [];
    }
  }

  parseWebhook(headers: Record<string, any>, payload: any, secret?: string): GitWebhookEvent | null {
    // Check GitLab secret token
    const token = headers['x-gitlab-token'] || headers['X-Gitlab-Token'];
    if (secret && token) {
      const tokBuf = Buffer.from(token, 'utf8');
      const secBuf = Buffer.from(secret, 'utf8');
      if (tokBuf.length !== secBuf.length || !crypto.timingSafeEqual(tokBuf, secBuf)) {
        this.logger.warn('GitLab webhook secret token mismatch');
        return null;
      }
    }

    const eventName = headers['x-gitlab-event'] || headers['X-Gitlab-Event'];
    const body = typeof payload === 'string' ? JSON.parse(payload) : payload;

    if (eventName === 'Push Hook' || body.object_kind === 'push') {
      const proj = body.project || {};
      const commits: GitCommit[] = (body.commits || []).map((c: any) => ({
        sha: c.id,
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
          owner: proj.namespace || 'unknown',
          name: proj.name || 'unknown',
          url: proj.web_url,
          defaultBranch: proj.default_branch || 'main',
        },
        commits,
        branchName,
        sender: body.user_username || body.user_name,
      };
    }

    if (eventName === 'Merge Request Hook' || body.object_kind === 'merge_request') {
      const mr = body.object_attributes || {};
      const proj = body.project || {};

      let mrState: 'open' | 'closed' | 'merged' = 'open';
      if (mr.state === 'merged') mrState = 'merged';
      else if (mr.state === 'closed') mrState = 'closed';

      return {
        event: 'pull_request',
        repository: {
          owner: proj.namespace || 'unknown',
          name: proj.name || 'unknown',
          url: proj.web_url,
          defaultBranch: proj.default_branch || 'main',
        },
        pullRequest: {
          id: String(mr.id),
          number: mr.iid,
          title: mr.title,
          body: mr.description || '',
          state: mrState,
          headBranch: mr.source_branch,
          baseBranch: mr.target_branch,
          url: mr.url,
          author: body.user?.username || 'unknown',
          createdAt: mr.created_at,
          mergedAt: mr.state === 'merged' ? mr.updated_at : undefined,
        },
        sender: body.user?.username,
      };
    }

    return null;
  }
}
