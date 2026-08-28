export interface ProjectData {
  id: string;
  key: string;
  name: string;
  slug?: string;
  description: string;
  visibility?: string;
  status?: string;
  issueCount?: number;
  createdAt?: string;
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
  componentId?: string;
  version?: string;
  versionId?: string;
  milestone?: string;
  milestoneId?: string;
  assigneeName?: string;
  assigneeId?: string;
  assigneeEmail?: string;
  reporterName?: string;
  reporterId?: string;
  createdAt: string;
  updatedAt: string;
  labels: string[];
  commentsCount?: number;
}

export interface ProjectMemberData {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  role: string;
  avatarUrl?: string;
  createdAt?: string;
}

export interface CommentData {
  id: string;
  user: string;
  userId?: string;
  text: string;
  time: string;
  createdAt?: string;
}

export interface NotificationData {
  id: string;
  title?: string;
  eventType: string;
  payload: any;
  isRead: boolean;
  createdAt: string;
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
  oauthProvider?: string;
  role: string;
}

export interface OrganizationData {
  id: string;
  slug: string;
  name: string;
  role: string;
}

export interface ProjectDefaultMetadata {
  issueTypes: Array<{ id: string; name: string; code: string; icon: string }>;
  priorities: Array<{ id: string; name: string; code: string; rank: number }>;
  severities: Array<{ id: string; name: string; code: string; rank: number }>;
  statuses: Array<{ id: string; name: string; code: string; category: string; rank: number }>;
}
