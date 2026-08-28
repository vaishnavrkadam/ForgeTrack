export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  uptimeSeconds: number;
  services: {
    database: 'connected' | 'disconnected';
    redis: 'connected' | 'disconnected';
  };
}

export interface ApiSuccessEnvelope<T> {
  data: T;
  meta?: Record<string, any>;
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    requestId?: string;
  };
}

// -------------------------------------------------------------
// Phase 15: Git Integrations
// -------------------------------------------------------------
export type GitProviderType = 'GITHUB' | 'GITLAB' | 'GENERIC_GIT';

export interface IntegrationDto {
  id: string;
  organizationId: string;
  projectId?: string;
  provider: GitProviderType;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR';
  configuration: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface RepositoryDto {
  id: string;
  integrationId: string;
  externalId?: string;
  owner: string;
  name: string;
  defaultBranch?: string;
  webUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type CodeLinkType = 'COMMIT' | 'PULL_REQUEST' | 'BRANCH' | 'CI_BUILD';

export interface CodeLinkDto {
  id: string;
  issueId: string;
  repositoryId?: string;
  externalType: CodeLinkType;
  externalId: string;
  title?: string;
  url: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface GitCommit {
  sha: string;
  message: string;
  authorName: string;
  authorEmail: string;
  url: string;
  committedAt: string;
}

export interface GitPullRequest {
  id: string;
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed' | 'merged';
  headBranch: string;
  baseBranch: string;
  url: string;
  author: string;
  createdAt: string;
  mergedAt?: string;
}

export interface GitWebhookEvent {
  event: 'push' | 'pull_request' | 'branch_created' | 'branch_deleted' | 'ping';
  repository: {
    owner: string;
    name: string;
    url?: string;
    defaultBranch?: string;
  };
  commits?: GitCommit[];
  pullRequest?: GitPullRequest;
  branchName?: string;
  sender?: string;
}

// -------------------------------------------------------------
// Phase 16: CI / Release Intelligence
// -------------------------------------------------------------
export type CiRunStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

export interface CiRunDto {
  id: string;
  organizationId: string;
  projectId: string;
  repositoryId?: string;
  commitSha: string;
  branch?: string;
  workflowName?: string;
  runNumber?: string;
  status: CiRunStatus;
  conclusion?: string;
  url?: string;
  metadata?: Record<string, any>;
  startedAt?: string;
  finishedAt?: string;
  createdAt: string;
}

export interface ReleaseHealthDto {
  versionId: string;
  versionName: string;
  totalIssues: number;
  statusBreakdown: {
    done: number;
    inProgress: number;
    todo: number;
  };
  completionPercentage: number;
  blockingDefectsCount: number;
  criticalDefectsCount: number;
  ciRunsSummary: {
    totalRuns: number;
    successRuns: number;
    failedRuns: number;
    passRatePercentage: number;
  };
  healthStatus: 'HEALTHY' | 'AT_RISK' | 'CRITICAL';
  riskFactors: string[];
}

// -------------------------------------------------------------
// Phase 17 & 18: AI Features
// -------------------------------------------------------------
export interface AiDuplicateCandidateDto {
  issueId: string;
  issueKey: string;
  title: string;
  similarity: number;
  reason: string;
  status?: string;
}

export interface AiQualityCheckResultDto {
  score: number; // 0 to 100
  missingElements: string[];
  ambiguities: string[];
  suggestedQuestions: string[];
  recommendations: string[];
}

export interface AiTriageSuggestionDto {
  suggestedIssueType?: { code: string; name: string; confidence: number; evidence: string };
  suggestedComponent?: { name: string; confidence: number; evidence: string };
  suggestedPriority?: { code: string; confidence: number; evidence: string };
  suggestedSeverity?: { code: string; confidence: number; evidence: string };
  suggestedLabels?: Array<{ name: string; confidence: number }>;
  suggestedAssignee?: { userId: string; displayName: string; reason: string };
}

export interface AiSuggestionRecordDto {
  id: string;
  organizationId: string;
  projectId?: string;
  issueId?: string;
  type: 'DUPLICATE' | 'QUALITY' | 'TRIAGE' | 'SUMMARY';
  model?: string;
  result: Record<string, any>;
  confidence?: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  createdAt: string;
}

// -------------------------------------------------------------
// Phase 19: AI Summaries & Semantic Search
// -------------------------------------------------------------
export interface AiSummaryDto {
  issueId: string;
  summary: string;
  cached: boolean;
  generatedAt: string;
}

export interface SemanticSearchResultDto {
  query: string;
  totalHits: number;
  hits: Array<{
    id: string;
    key: string;
    title: string;
    statusName: string;
    priorityName?: string;
    similarity: number;
  }>;
}

// -------------------------------------------------------------
// Phase 20: Import / Export
// -------------------------------------------------------------
export interface ImportJobDto {
  id: string;
  organizationId: string;
  projectId: string;
  sourceType: 'CSV' | 'JSON' | 'BUGZILLA';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  errors: Array<{
    recordIndex: number;
    title: string;
    errorMessage: string;
  }>;
  createdAt: string;
  finishedAt?: string;
}

// -------------------------------------------------------------
// Phase 21 & 22: Webhooks & External API Maturity
// -------------------------------------------------------------
export interface WebhookDto {
  id: string;
  organizationId: string;
  projectId?: string;
  url: string;
  events: string[];
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDeliveryDto {
  id: string;
  webhookId: string;
  eventId?: string;
  attemptCount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'RETRY';
  responseStatus?: number;
  responseBody?: string;
  nextAttemptAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

export interface OutboundWebhookPayload {
  id: string;
  event: string;
  occurredAt: string;
  data: Record<string, any>;
}

