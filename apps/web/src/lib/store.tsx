'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  IssueData,
  ProjectData,
  ReleaseData,
  WebhookData,
  CiRunData,
  UserData,
  OrganizationData,
} from './types';
import { api } from './api';
import {
  fetchProjects,
  fetchProjectIssues,
  createIssue as apiCreateIssue,
  updateIssue as apiUpdateIssue,
} from './api/issues';

const INITIAL_RELEASES: ReleaseData[] = [];
const INITIAL_WEBHOOKS: WebhookData[] = [];
const INITIAL_CI_RUNS: CiRunData[] = [];

interface StoreContextType {
  currentUser: UserData | null;
  currentOrg: OrganizationData | null;
  setCurrentOrg: (org: OrganizationData | null) => void;
  isLoadingUser: boolean;
  login: (provider?: 'github' | 'google' | 'email', name?: string, email?: string, avatarUrl?: string) => Promise<void>;
  loginDev: (provider?: 'github' | 'google' | 'email', name?: string, email?: string, avatarUrl?: string) => Promise<void>;
  loginEmail: (email: string, password: string, isSignUp?: boolean, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  isInviteModalOpen: boolean;
  setIsInviteModalOpen: (open: boolean) => void;
  viewMode: 'app' | 'landing';
  setViewMode: (mode: 'app' | 'landing') => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedProject: ProjectData | null;
  setSelectedProject: (proj: ProjectData | null) => void;
  projects: ProjectData[];
  issues: IssueData[];
  isLoadingIssues: boolean;
  reloadProjects: () => Promise<void>;
  reloadIssues: () => Promise<void>;
  releases: ReleaseData[];
  webhooks: WebhookData[];
  ciRuns: CiRunData[];
  selectedIssue: IssueData | null;
  setSelectedIssue: (issue: IssueData | null) => void;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  createIssue: (dto: Partial<IssueData>) => Promise<IssueData | null>;
  updateIssueStatus: (issueId: string, status: string, category: 'TODO' | 'IN_PROGRESS' | 'DONE') => Promise<void>;
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
  const [currentOrg, setCurrentOrg] = useState<OrganizationData | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'app' | 'landing'>('landing');
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectData | null>(null);
  const [issues, setIssues] = useState<IssueData[]>([]);
  const [isLoadingIssues, setIsLoadingIssues] = useState<boolean>(false);

  const [releases] = useState<ReleaseData[]>(INITIAL_RELEASES);
  const [webhooks] = useState<WebhookData[]>(INITIAL_WEBHOOKS);
  const [ciRuns] = useState<CiRunData[]>(INITIAL_CI_RUNS);

  const [selectedIssue, setSelectedIssue] = useState<IssueData | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');

  /**
   * Hydrate authenticated user session from GET /auth/me
   */
  const hydrateSession = useCallback(async () => {
    setIsLoadingUser(true);
    try {
      const data = await api.get<{ user: any; organization?: any }>('/auth/me');
      if (data && data.user) {
        const u: UserData = {
          id: data.user.id,
          email: data.user.email,
          displayName: data.user.displayName,
          avatarUrl: data.user.avatarUrl,
          oauthProvider: data.user.oauthProvider,
          provider: data.user.oauthProvider || 'email',
          role: data.organization?.role || 'Engineer',
        };
        setCurrentUser(u);
        setCurrentOrg(data.organization || null);
        setViewMode('app');

        // Check if there is a pending workspace invitation token
        try {
          const pendingToken = typeof window !== 'undefined' ? localStorage.getItem('pending_join_token') : null;
          if (pendingToken) {
            const acceptRes = await api.post<any>('/invitations/accept', { token: pendingToken });
            localStorage.removeItem('pending_join_token');
            if (acceptRes && acceptRes.organization) {
              const joinedOrg = {
                id: acceptRes.organization.id,
                slug: acceptRes.organization.slug,
                name: acceptRes.organization.name,
                role: acceptRes.role || 'DEVELOPER',
              };
              setCurrentOrg(joinedOrg);
              const projs = await fetchProjects(joinedOrg.id);
              setProjects(projs || []);
              if (projs && projs.length > 0) {
                setSelectedProject(projs[0]);
              }
            }
          }
        } catch (invErr) {
          console.warn('Auto accept error:', invErr);
          try {
            localStorage.removeItem('pending_join_token');
          } catch {
            // Ignored
          }
        }
      }
    } catch {
      // Not authenticated yet
      setCurrentUser(null);
      setCurrentOrg(null);
    } finally {
      setIsLoadingUser(false);
    }
  }, []);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  /**
   * Fetch projects for current organization
   */
  const reloadProjects = useCallback(async () => {
    if (!currentOrg) return;
    try {
      const list = await fetchProjects(currentOrg.id);
      setProjects(list || []);
      if (list && list.length > 0) {
        // Keep currently selected or pick the first
        setSelectedProject(prev => {
          if (prev) {
            const match = list.find(p => p.id === prev.id);
            if (match) return match;
          }
          return list[0];
        });
      } else {
        setSelectedProject(null);
      }
    } catch (err) {
      console.warn('Failed to load projects:', err);
    }
  }, [currentOrg]);

  useEffect(() => {
    if (currentOrg) {
      reloadProjects();
    }
  }, [currentOrg, reloadProjects]);

  /**
   * Fetch issues for selected project
   */
  const reloadIssues = useCallback(async () => {
    if (!selectedProject) {
      setIssues([]);
      return;
    }
    setIsLoadingIssues(true);
    try {
      const list = await fetchProjectIssues(selectedProject.id);
      setIssues(list);
    } catch (err) {
      console.warn('Failed to fetch issues:', err);
    } finally {
      setIsLoadingIssues(false);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (selectedProject) {
      reloadIssues();
    } else {
      setIssues([]);
    }
  }, [selectedProject, reloadIssues]);

  const loginDev = async (
    provider: 'github' | 'google' | 'email' = 'github',
    name?: string,
    email?: string,
    avatarUrl?: string,
  ) => {
    try {
      const data = await api.post<{ user: any; organization?: any }>('/auth/dev-login', {
        provider,
        displayName: name,
        email,
        avatarUrl,
      });

      if (data && data.user) {
        const u: UserData = {
          id: data.user.id,
          email: data.user.email,
          displayName: data.user.displayName,
          avatarUrl: data.user.avatarUrl,
          oauthProvider: data.user.oauthProvider,
          provider,
          role: data.organization?.role || 'Lead Architect',
        };
        setCurrentUser(u);
        setCurrentOrg(data.organization || null);
        setViewMode('app');
        setIsAuthModalOpen(false);
      }
    } catch (err) {
      console.error('Dev login error:', err);
    }
  };

  const loginEmail = async (
    email: string,
    password: string,
    isSignUp: boolean = false,
    displayName?: string,
  ) => {
    const endpoint = isSignUp ? '/auth/register' : '/auth/login';
    const body = isSignUp ? { email, password, displayName: displayName || 'Engineer' } : { email, password };

    const data = await api.post<{ user: any; organization?: any }>(endpoint, body);
    if (data && data.user) {
      const u: UserData = {
        id: data.user.id,
        email: data.user.email,
        displayName: data.user.displayName,
        avatarUrl: data.user.avatarUrl,
        oauthProvider: data.user.oauthProvider,
        provider: 'email',
        role: data.organization?.role || 'Lead Architect',
      };
      setCurrentUser(u);
      setCurrentOrg(data.organization || null);
      setViewMode('app');
      setIsAuthModalOpen(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignored
    }
    localStorage.removeItem('forgetrack_token');
    document.cookie = 'sid=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    setCurrentUser(null);
    setCurrentOrg(null);
    setSelectedProject(null);
    setProjects([]);
    setIssues([]);
    setViewMode('landing');
  };

  const createIssue = async (data: Partial<IssueData>): Promise<IssueData | null> => {
    if (!selectedProject || !currentOrg) return null;

    try {
      const created = await apiCreateIssue(selectedProject.id, {
        title: data.title,
        description: data.description,
        type: data.type || 'BUG',
        priority: data.priority || 'MEDIUM',
        severity: data.severity || 'MAJOR',
        component: data.component,
        componentId: data.componentId,
        versionId: data.versionId,
        milestoneId: data.milestoneId,
        assigneeId: data.assigneeId,
        reproductionSteps: (data as any).reproductionSteps,
        expectedResult: (data as any).expectedResult,
        actualResult: (data as any).actualResult,
      });

      await reloadIssues();
      setSelectedIssue(created);
      return created;
    } catch (err) {
      console.error('Failed to create issue:', err);
      throw err;
    }
  };

  const updateIssueStatus = async (
    issueId: string,
    status: string,
    category: 'TODO' | 'IN_PROGRESS' | 'DONE',
  ) => {
    // Optimistic UI update
    setIssues(prev =>
      prev.map(i =>
        i.id === issueId ? { ...i, status, statusCategory: category, updatedAt: new Date().toISOString() } : i,
      ),
    );

    if (selectedIssue && selectedIssue.id === issueId) {
      setSelectedIssue(prev => (prev ? { ...prev, status, statusCategory: category } : null));
    }

    try {
      await apiUpdateIssue(issueId, { status });
    } catch (err) {
      console.error('Failed to update issue status on server:', err);
      await reloadIssues();
    }
  };

  return (
    <StoreContext.Provider
      value={{
        currentUser,
        currentOrg,
        setCurrentOrg,
        isLoadingUser,
        login: loginDev,
        loginDev,
        loginEmail,
        logout,
        isAuthModalOpen,
        setIsAuthModalOpen,
        isInviteModalOpen,
        setIsInviteModalOpen,
        viewMode,
        setViewMode,
        activeTab,
        setActiveTab,
        selectedProject,
        setSelectedProject,
        projects,
        issues,
        isLoadingIssues,
        reloadProjects,
        reloadIssues,
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
