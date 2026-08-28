'use client';

import React, { createContext, useContext, useState } from 'react';
import { IssueData, ProjectData, ReleaseData, WebhookData, CiRunData } from './types';

const INITIAL_PROJECTS: ProjectData[] = [
  { id: 'proj-1', key: 'FORGE', name: 'ForgeTrack Core Engine', description: 'Core issue tracking backend & workflow engine', issueCount: 28 },
  { id: 'proj-2', key: 'WEB', name: 'Web Dashboard & UI', description: 'Next.js frontend application and interaction design', issueCount: 14 },
  { id: 'proj-3', key: 'AI', name: 'AI Intelligence Pipeline', description: 'Embeddings, duplicate detection & triage classifiers', issueCount: 8 },
];

const INITIAL_ISSUES: IssueData[] = [
  {
    id: 'iss-101',
    key: 'FORGE-101',
    number: 101,
    title: 'Atomic issue counter lock during high concurrency',
    description: 'Ensure postgres row-level lock `FOR UPDATE` prevents duplicate sequence numbers under burst creation traffic.',
    type: 'BUG',
    status: 'IN PROGRESS',
    statusCategory: 'IN_PROGRESS',
    priority: 'URGENT',
    severity: 'BLOCKER',
    component: 'Database',
    version: 'v1.4.0',
    milestone: 'Sprint 24',
    assigneeName: 'Alex Chen',
    reporterName: 'Sarah Miller',
    createdAt: '2026-08-27T10:30:00Z',
    updatedAt: '2026-08-28T08:15:00Z',
    labels: ['concurrency', 'database', 'critical'],
    commentsCount: 5,
  },
  {
    id: 'iss-102',
    key: 'WEB-42',
    number: 42,
    title: 'Implement custom bug cursor with requestAnimationFrame smoothing',
    description: 'Cursor should squash on click and peek towards hoverable primary buttons without causing React re-renders.',
    type: 'FEATURE',
    status: 'RESOLVED',
    statusCategory: 'DONE',
    priority: 'HIGH',
    severity: 'MAJOR',
    component: 'UI/UX',
    version: 'v1.5.0',
    milestone: 'Sprint 24',
    assigneeName: 'Elena Rostova',
    reporterName: 'Alex Chen',
    createdAt: '2026-08-27T14:20:00Z',
    updatedAt: '2026-08-28T07:45:00Z',
    labels: ['frontend', 'cursor', 'animation'],
    commentsCount: 3,
  },
  {
    id: 'iss-103',
    key: 'AI-18',
    number: 18,
    title: 'Semantic duplicate candidate scoring threshold optimization',
    description: 'Tune cosine similarity cutoff to 0.70 with Reciprocal Rank Fusion on hybrid SQL + vector queries.',
    type: 'TASK',
    status: 'OPEN',
    statusCategory: 'TODO',
    priority: 'MEDIUM',
    severity: 'MAJOR',
    component: 'AI Engine',
    version: 'v1.5.0',
    milestone: 'Sprint 25',
    assigneeName: 'Marcus Vance',
    reporterName: 'Sarah Miller',
    createdAt: '2026-08-28T04:10:00Z',
    updatedAt: '2026-08-28T04:10:00Z',
    labels: ['ai', 'embeddings', 'vector'],
    commentsCount: 1,
  },
  {
    id: 'iss-104',
    key: 'FORGE-104',
    number: 104,
    title: 'Webhook HMAC signature validation and exponential backoff retry',
    description: 'Verify `X-Hub-Signature-256` for incoming git events and schedule exponential retries for failed outbound webhook endpoints.',
    type: 'FEATURE',
    status: 'IN PROGRESS',
    statusCategory: 'IN_PROGRESS',
    priority: 'HIGH',
    severity: 'MAJOR',
    component: 'Integrations',
    version: 'v1.4.0',
    milestone: 'Sprint 24',
    assigneeName: 'Alex Chen',
    reporterName: 'Elena Rostova',
    createdAt: '2026-08-26T09:00:00Z',
    updatedAt: '2026-08-28T06:30:00Z',
    labels: ['webhooks', 'security', 'git'],
    commentsCount: 4,
  },
  {
    id: 'iss-105',
    key: 'FORGE-105',
    number: 105,
    title: 'SSRF URL validation on outbound integration endpoints',
    description: 'Block loopback addresses, private IP ranges, and cloud metadata services (169.254.169.254).',
    type: 'BUG',
    status: 'RESOLVED',
    statusCategory: 'DONE',
    priority: 'URGENT',
    severity: 'CRITICAL',
    component: 'Security',
    version: 'v1.4.0',
    milestone: 'Sprint 24',
    assigneeName: 'Sarah Miller',
    reporterName: 'Alex Chen',
    createdAt: '2026-08-25T11:00:00Z',
    updatedAt: '2026-08-28T05:20:00Z',
    labels: ['security', 'ssrf', 'hardening'],
    commentsCount: 6,
  },
];

const INITIAL_RELEASES: ReleaseData[] = [
  {
    id: 'rel-1',
    name: 'v1.4.0 — Security & Webhooks Release',
    status: 'PLANNED',
    releaseDate: '2026-09-02',
    totalIssues: 12,
    doneIssues: 9,
    blockingDefects: 0,
    ciPassRate: 98,
    health: 'HEALTHY',
  },
  {
    id: 'rel-2',
    name: 'v1.5.0 — AI & Experience Overhaul',
    status: 'ACTIVE',
    releaseDate: '2026-09-18',
    totalIssues: 24,
    doneIssues: 11,
    blockingDefects: 1,
    ciPassRate: 88,
    health: 'AT_RISK',
  },
];

const INITIAL_WEBHOOKS: WebhookData[] = [
  {
    id: 'wh-1',
    url: 'https://ci-runner.internal.acme/webhook/builds',
    events: ['issue.created', 'issue.updated', 'issue.transitioned'],
    isEnabled: true,
    createdAt: '2026-08-26T12:00:00Z',
  },
  {
    id: 'wh-2',
    url: 'https://discord.com/api/webhooks/12345/alerts',
    events: ['release.published', 'defect.blocker'],
    isEnabled: true,
    createdAt: '2026-08-27T08:00:00Z',
  },
];

const INITIAL_CI_RUNS: CiRunData[] = [
  { id: 'ci-1', commitSha: 'a1b2c3d4', workflowName: 'Build & Unit Tests', status: 'SUCCESS', url: 'https://github.com/acme/forgetrack/actions/runs/101', startedAt: '12 mins ago' },
  { id: 'ci-2', commitSha: 'e5f6g7h8', workflowName: 'E2E Matrix & Security Scan', status: 'SUCCESS', url: 'https://github.com/acme/forgetrack/actions/runs/102', startedAt: '35 mins ago' },
  { id: 'ci-3', commitSha: 'k9l0m1n2', workflowName: 'Docker Production Artifacts', status: 'RUNNING', url: 'https://github.com/acme/forgetrack/actions/runs/103', startedAt: '3 mins ago' },
];

interface StoreContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedProject: ProjectData;
  setSelectedProject: (proj: ProjectData) => void;
  projects: ProjectData[];
  issues: IssueData[];
  releases: ReleaseData[];
  webhooks: WebhookData[];
  ciRuns: CiRunData[];
  selectedIssue: IssueData | null;
  setSelectedIssue: (issue: IssueData | null) => void;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  createIssue: (issue: Partial<IssueData>) => void;
  updateIssueStatus: (issueId: string, status: string, category: 'TODO' | 'IN_PROGRESS' | 'DONE') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterType: string;
  setFilterType: (type: string) => void;
  filterPriority: string;
  setFilterPriority: (priority: string) => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [projects] = useState<ProjectData[]>(INITIAL_PROJECTS);
  const [selectedProject, setSelectedProject] = useState<ProjectData>(INITIAL_PROJECTS[0]);
  const [issues, setIssues] = useState<IssueData[]>(INITIAL_ISSUES);
  const [releases] = useState<ReleaseData[]>(INITIAL_RELEASES);
  const [webhooks] = useState<WebhookData[]>(INITIAL_WEBHOOKS);
  const [ciRuns] = useState<CiRunData[]>(INITIAL_CI_RUNS);
  const [selectedIssue, setSelectedIssue] = useState<IssueData | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');

  const createIssue = (data: Partial<IssueData>) => {
    const nextNum = issues.length + 101;
    const newIssue: IssueData = {
      id: `iss-${Date.now()}`,
      key: `${selectedProject.key}-${nextNum}`,
      number: nextNum,
      title: data.title || 'Untitled Issue',
      description: data.description || '',
      type: data.type || 'BUG',
      status: 'OPEN',
      statusCategory: 'TODO',
      priority: data.priority || 'MEDIUM',
      severity: data.severity || 'MAJOR',
      component: data.component || 'General',
      version: data.version || 'v1.5.0',
      milestone: data.milestone || 'Sprint 25',
      assigneeName: data.assigneeName || 'Unassigned',
      reporterName: 'You (Current User)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      labels: data.labels || [],
      commentsCount: 0,
    };

    setIssues(prev => [newIssue, ...prev]);
    setSelectedIssue(newIssue);
  };

  const updateIssueStatus = (issueId: string, status: string, category: 'TODO' | 'IN_PROGRESS' | 'DONE') => {
    setIssues(prev =>
      prev.map(i =>
        i.id === issueId ? { ...i, status, statusCategory: category, updatedAt: new Date().toISOString() } : i,
      ),
    );
    if (selectedIssue && selectedIssue.id === issueId) {
      setSelectedIssue(prev => (prev ? { ...prev, status, statusCategory: category } : null));
    }
  };

  return (
    <StoreContext.Provider
      value={{
        activeTab,
        setActiveTab,
        selectedProject,
        setSelectedProject,
        projects,
        issues,
        releases,
        webhooks,
        ciRuns,
        selectedIssue,
        setSelectedIssue,
        isCreateModalOpen,
        setIsCreateModalOpen,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        createIssue,
        updateIssueStatus,
        searchQuery,
        setSearchQuery,
        filterType,
        setFilterType,
        filterPriority,
        setFilterPriority,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};
