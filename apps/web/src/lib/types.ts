export interface ProjectData {
  id: string;
  key: string;
  name: string;
  description: string;
  issueCount: number;
}

export interface IssueData {
  id: string;
  key: string;
  number: number;
  title: string;
  description: string;
  type: string;
  status: string;
  statusCategory: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority: string;
  severity: string;
  component?: string;
  version?: string;
  milestone?: string;
  assigneeName?: string;
  reporterName?: string;
  createdAt: string;
  updatedAt: string;
  labels: string[];
  commentsCount: number;
}

export interface ReleaseData {
  id: string;
  name: string;
  status: string;
  releaseDate: string;
  totalIssues: number;
  doneIssues: number;
  blockingDefects: number;
  ciPassRate: number;
  health: 'HEALTHY' | 'AT_RISK' | 'CRITICAL';
}

export interface WebhookData {
  id: string;
  url: string;
  events: string[];
  isEnabled: boolean;
  createdAt: string;
}

export interface CiRunData {
  id: string;
  commitSha: string;
  workflowName: string;
  status: 'SUCCESS' | 'FAILED' | 'RUNNING';
  url: string;
  startedAt: string;
}

export interface UserData {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  provider: 'github' | 'google' | 'email';
  role: string;
}
