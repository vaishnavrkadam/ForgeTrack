import { api } from '../api';
import { IssueData, ProjectData, ProjectMemberData, ProjectDefaultMetadata, CommentData } from '../types';

export async function fetchProjects(orgId: string): Promise<ProjectData[]> {
  return api.get<ProjectData[]>(`/organizations/${orgId}/projects`);
}

export async function createProject(orgId: string, dto: { name: string; key: string; description?: string; visibility: string }): Promise<ProjectData> {
  return api.post<ProjectData>(`/organizations/${orgId}/projects`, dto);
}

export async function importProjectFromGitHub(dto: { repoOwner: string; repoName: string; name?: string; key?: string; description?: string }): Promise<ProjectData> {
  return api.post<ProjectData>('/projects/import-from-github', dto);
}

export async function fetchProjectDefaults(projectId: string): Promise<ProjectDefaultMetadata> {
  return api.get<ProjectDefaultMetadata>(`/projects/${projectId}/defaults`);
}

export async function fetchProjectMembers(projectId: string): Promise<ProjectMemberData[]> {
  return api.get<ProjectMemberData[]>(`/projects/${projectId}/members`);
}

export async function fetchProjectIssues(projectId: string, params?: Record<string, any>): Promise<IssueData[]> {
  const rawList = await api.get<any[]>(`/projects/${projectId}/issues`, params);
  return rawList.map(raw => ({
    id: raw.id,
    key: raw.projectKey ? `${raw.projectKey}-${raw.number}` : raw.key || `ISSUE-${raw.number || ''}`,
    number: raw.number,
    title: raw.title,
    description: raw.description || '',
    type: raw.issueTypeCode || raw.type || 'BUG',
    status: raw.statusCode || raw.status || 'OPEN',
    statusCategory: (raw.statusCategory || 'TODO') as 'TODO' | 'IN_PROGRESS' | 'DONE',
    priority: raw.priorityCode || raw.priority || 'MEDIUM',
    severity: raw.severityCode || raw.severity || 'MAJOR',
    component: raw.componentName || raw.component || 'General',
    componentId: raw.componentId,
    version: raw.versionName || raw.version || 'v1.0.0',
    versionId: raw.versionId,
    milestone: raw.milestoneName || raw.milestone || 'Sprint 1',
    milestoneId: raw.milestoneId,
    assigneeName: raw.assigneeName || 'Unassigned',
    assigneeId: raw.assigneeId,
    reporterName: raw.reporterName || 'Admin',
    reporterId: raw.reporterId,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
    labels: Array.isArray(raw.labels) ? raw.labels.map((l: any) => typeof l === 'string' ? l : l.name) : [],
    commentsCount: raw.commentsCount || 0,
  }));
}

export async function createIssue(projectId: string, dto: any): Promise<IssueData> {
  return api.post<IssueData>(`/projects/${projectId}/issues`, dto);
}

export async function updateIssue(issueId: string, dto: any): Promise<IssueData> {
  return api.patch<IssueData>(`/issues/${issueId}`, dto);
}

export async function fetchIssueDetails(issueId: string): Promise<IssueData> {
  return api.get<IssueData>(`/issues/${issueId}`);
}

export async function fetchIssueComments(issueId: string): Promise<CommentData[]> {
  const rawList = await api.get<any[]>(`/issues/${issueId}/comments`);
  return rawList.map(raw => ({
    id: raw.id,
    user: raw.displayName || raw.authorName || 'Team Member',
    userId: raw.userId || raw.authorId,
    text: raw.body || raw.text || '',
    time: raw.createdAt ? new Date(raw.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
    createdAt: raw.createdAt,
  }));
}

export async function addIssueComment(issueId: string, body: string): Promise<CommentData> {
  const raw = await api.post(`/issues/${issueId}/comments`, { body });
  return {
    id: raw.id || `c-${Date.now()}`,
    user: raw.displayName || 'You',
    userId: raw.userId,
    text: raw.body || body,
    time: 'Just now',
    createdAt: new Date().toISOString(),
  };
}

export async function fetchProjectStats(projectId: string): Promise<any> {
  return api.get(`/projects/${projectId}/stats`);
}

export async function fetchNotifications(): Promise<any[]> {
  return api.get('/notifications');
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  return api.post(`/notifications/${notificationId}/read`);
}
