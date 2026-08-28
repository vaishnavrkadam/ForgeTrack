'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { IssueData, ProjectData, ReleaseData, WebhookData, CiRunData, UserData } from './types';

const INITIAL_PROJECTS: ProjectData[] = [
  { id: 'proj-1', key: 'FORGE', name: 'ForgeTrack Core Engine', description: 'Core issue tracking backend & workflow engine', issueCount: 0 },
  { id: 'proj-2', key: 'WEB', name: 'Web Dashboard & UI', description: 'Next.js frontend application and interaction design', issueCount: 0 },
  { id: 'proj-3', key: 'AI', name: 'AI Intelligence Pipeline', description: 'Embeddings, duplicate detection & triage classifiers', issueCount: 0 },
];

const INITIAL_RELEASES: ReleaseData[] = [
  {
    id: 'rel-1',
    name: 'v1.0.0 — Production Release',
    status: 'ACTIVE',
    releaseDate: '2026-09-01',
    totalIssues: 0,
    doneIssues: 0,
    blockingDefects: 0,
    ciPassRate: 100,
    health: 'HEALTHY',
  },
];

const INITIAL_WEBHOOKS: WebhookData[] = [
  {
    id: 'wh-1',
    url: 'https://api.github.com/repos/vaishnavrkadam/ForgeTrack/webhooks',
    events: ['issue.created', 'issue.updated', 'issue.transitioned'],
    isEnabled: true,
    createdAt: new Date().toISOString(),
  },
];

const INITIAL_CI_RUNS: CiRunData[] = [
  { id: 'ci-1', commitSha: 'main-latest', workflowName: 'Build & Unit Tests', status: 'SUCCESS', url: 'https://github.com/vaishnavrkadam/ForgeTrack/actions', startedAt: 'Just now' },
];

interface StoreContextType {
  currentUser: UserData | null;
  login: (provider: 'github' | 'google' | 'email', displayName?: string, email?: string, avatarUrl?: string) => void;
  logout: () => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  viewMode: 'app' | 'landing';
  setViewMode: (mode: 'app' | 'landing') => void;
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
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'app' | 'landing'>('landing');

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [projects] = useState<ProjectData[]>(INITIAL_PROJECTS);
  const [selectedProject, setSelectedProject] = useState<ProjectData>(INITIAL_PROJECTS[0]);
  const [issues, setIssues] = useState<IssueData[]>([]);
  const [releases] = useState<ReleaseData[]>(INITIAL_RELEASES);
  const [webhooks] = useState<WebhookData[]>(INITIAL_WEBHOOKS);
  const [ciRuns] = useState<CiRunData[]>(INITIAL_CI_RUNS);
  const [selectedIssue, setSelectedIssue] = useState<IssueData | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('forgetrack_user');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setCurrentUser(parsedUser);
        setViewMode('app');
      }

      const savedIssues = localStorage.getItem('forgetrack_issues');
      if (savedIssues) {
        setIssues(JSON.parse(savedIssues));
      }
    } catch {
      // Ignored
    }
  }, []);

  const login = (
    provider: 'github' | 'google' | 'email',
    displayName?: string,
    email?: string,
    avatarUrl?: string,
  ) => {
    let defaultName = 'Developer';
    let defaultEmail = 'developer@forgetrack.dev';

    if (provider === 'github') {
      defaultName = displayName || 'GitHub Engineer';
      defaultEmail = email || 'github-user@users.noreply.github.com';
    } else if (provider === 'google') {
      defaultName = displayName || 'Google User';
      defaultEmail = email || 'google-user@gmail.com';
    } else {
      defaultName = displayName || 'Engineering Lead';
      defaultEmail = email || 'engineer@company.com';
    }

    const user: UserData = {
      id: `usr-${Date.now()}`,
      email: defaultEmail,
      displayName: defaultName,
      avatarUrl: avatarUrl || undefined,
      provider,
      role: 'Lead Architect',
    };

    setCurrentUser(user);
    setViewMode('app');
    setIsAuthModalOpen(false);

    try {
      localStorage.setItem('forgetrack_user', JSON.stringify(user));
    } catch {
      // Ignored
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setViewMode('landing');
    try {
      localStorage.removeItem('forgetrack_user');
    } catch {
      // Ignored
    }
  };

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
      version: data.version || 'v1.0.0',
      milestone: data.milestone || 'Sprint 1',
      assigneeName: data.assigneeName || currentUser?.displayName || 'Unassigned',
      reporterName: currentUser?.displayName || 'Current User',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      labels: data.labels || [],
      commentsCount: 0,
    };

    const updated = [newIssue, ...issues];
    setIssues(updated);
    setSelectedIssue(newIssue);

    try {
      localStorage.setItem('forgetrack_issues', JSON.stringify(updated));
    } catch {
      // Ignored
    }
  };

  const updateIssueStatus = (issueId: string, status: string, category: 'TODO' | 'IN_PROGRESS' | 'DONE') => {
    const updated = issues.map(i =>
      i.id === issueId ? { ...i, status, statusCategory: category, updatedAt: new Date().toISOString() } : i,
    );
    setIssues(updated);

    if (selectedIssue && selectedIssue.id === issueId) {
      setSelectedIssue(prev => (prev ? { ...prev, status, statusCategory: category } : null));
    }

    try {
      localStorage.setItem('forgetrack_issues', JSON.stringify(updated));
    } catch {
      // Ignored
    }
  };

  return (
    <StoreContext.Provider
      value={{
        currentUser,
        login,
        logout,
        isAuthModalOpen,
        setIsAuthModalOpen,
        viewMode,
        setViewMode,
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
