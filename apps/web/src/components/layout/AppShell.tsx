'use client';

import React from 'react';
import { useStore } from '../../lib/store';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { DashboardView } from './DashboardView';
import { IssuesListView } from '../issues/IssuesListView';
import { KanbanBoardView } from '../issues/KanbanBoardView';
import { ReleasesView } from '../releases/ReleasesView';
import { AiWorkbenchView } from '../ai/AiWorkbenchView';
import { IntegrationsView } from '../integrations/IntegrationsView';
import { SettingsView } from '../settings/SettingsView';
import { CreateIssueModal } from '../issues/CreateIssueModal';
import { IssueDetailView } from '../issues/IssueDetailView';
import { CommandPalette } from '../command/CommandPalette';

export const AppShell: React.FC = () => {
  const { activeTab } = useStore();

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'issues':
        return <IssuesListView />;
      case 'board':
        return <KanbanBoardView />;
      case 'releases':
        return <ReleasesView />;
      case 'ai':
        return <AiWorkbenchView />;
      case 'integrations':
        return <IntegrationsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf9f5] dark:bg-[#121110] text-[#1c1917] dark:text-[#f5f5f4]">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full">
          {renderActiveView()}
        </main>
      </div>

      {/* Global Overlays & Modals */}
      <CreateIssueModal />
      <IssueDetailView />
      <CommandPalette />
    </div>
  );
};
