'use client';

import React from 'react';
import { useStore } from '../../lib/store';
import {
  DashboardIcon,
  BugIcon,
  BoardIcon,
  ReleaseIcon,
  SparklesIcon,
  IntegrationIcon,
  SettingsIcon,
} from '../ui/Icons';
import { BugMascot } from '../mascot/BugMascot';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, issues, selectedProject, setIsInviteModalOpen } = useStore();

  const projectOpenIssuesCount = issues.filter(
    i => (!selectedProject || i.key.startsWith(selectedProject.key)) && i.statusCategory !== 'DONE',
  ).length;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
    { id: 'issues', label: 'All Issues', icon: BugIcon, badge: projectOpenIssuesCount },
    { id: 'board', label: 'Kanban Board', icon: BoardIcon },
    { id: 'releases', label: 'Releases & CI', icon: ReleaseIcon },
    { id: 'ai', label: 'AI Workbench', icon: SparklesIcon, highlight: true },
    { id: 'integrations', label: 'Integrations & Git', icon: IntegrationIcon },
    { id: 'settings', label: 'Settings & Logs', icon: SettingsIcon },
  ];

  return (
    <aside className="w-56 border-r border-[#e7e2d6] dark:border-[#33302a] bg-[#fbf9f5] dark:bg-[#121110] flex flex-col justify-between p-3 select-none">
      {/* Navigation Links */}
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#a8a29e] flex justify-between items-center">
          <span>Navigation</span>
          {selectedProject && (
            <span className="font-mono text-[9px] bg-[#e7e2d6] dark:bg-[#33302a] px-1.5 py-0.2 rounded text-[#1c1917] dark:text-white">
              {selectedProject.key}
            </span>
          )}
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-white dark:bg-[#1c1b18] text-[#1c1917] dark:text-[#f5f5f4] shadow-xs border border-[#e7e2d6] dark:border-[#33302a]'
                  : 'text-[#78716c] hover:bg-[#f5f0e6] dark:hover:bg-[#1c1b18]/60 hover:text-[#1c1917] dark:hover:text-[#f5f5f4]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 ${
                    isActive
                      ? 'text-[#1c1917] dark:text-[#d4f033]'
                      : item.highlight
                      ? 'text-[#8b5cf6]'
                      : 'text-[#78716c]'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                    isActive
                      ? 'bg-[#ccee22] text-[#1c1917]'
                      : 'bg-[#e7e2d6] dark:bg-[#33302a] text-[#78716c]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Mascot Card & Invite Action at Sidebar Bottom */}
      <div className="space-y-2">
        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="w-full py-1.5 px-3 bg-[#f5f0e6] dark:bg-[#262420] hover:bg-[#e7e2d6] text-xs font-bold text-[#1c1917] dark:text-white rounded-xl border border-[#e7e2d6] dark:border-[#33302a] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <span>✉️ Invite Team</span>
        </button>

        <div className="p-3 bg-gradient-to-b from-[#f5f0e6] to-[#eae3d2] dark:from-[#1c1b18] dark:to-[#262420] border border-[#e7e2d6] dark:border-[#33302a] rounded-2xl flex items-center gap-3">
          <BugMascot state="working" size={32} interactive className="animate-bug-bounce" />
          <div className="text-[11px] leading-tight">
            <div className="font-bold text-[#1c1917] dark:text-white">{selectedProject?.key || 'Active'} Active</div>
            <div className="text-[#78716c] text-[10px]">Zero bugs escape.</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
