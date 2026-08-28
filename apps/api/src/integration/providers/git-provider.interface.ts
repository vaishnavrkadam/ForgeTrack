import { GitCommit, GitPullRequest, GitWebhookEvent } from '@forgetrack/contracts';

export interface GitProvider {
  readonly providerType: string;
  validateConnection(config: Record<string, any>): Promise<boolean>;
  listRepositories(config: Record<string, any>): Promise<Array<{ externalId: string; owner: string; name: string; defaultBranch: string; webUrl: string }>>;
  getPullRequest(config: Record<string, any>, repoOwner: string, repoName: string, prNumber: number): Promise<GitPullRequest | null>;
  getCommit(config: Record<string, any>, repoOwner: string, repoName: string, sha: string): Promise<GitCommit | null>;
  listBranches(config: Record<string, any>, repoOwner: string, repoName: string): Promise<string[]>;
  parseWebhook(headers: Record<string, any>, payload: any, secret?: string): GitWebhookEvent | null;
}
