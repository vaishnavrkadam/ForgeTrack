'use client';

import React from 'react';
import { useStore } from '../../lib/store';
import { useSound } from '../sound/SoundProvider';
import { BugMascot } from '../mascot/BugMascot';
import { SparklesIcon, PlusIcon } from '../ui/Icons';

export const DashboardView: React.FC = () => {
  const { issues, releases, selectedProject, setSelectedIssue, setIsCreateModalOpen, setActiveTab, currentUser } = useStore();
  const { playHoverSound } = useSound();

  if (!selectedProject) {
    return null;
  }

  // Filter issues for the currently selected project
  const projectIssues = issues;
  const openIssues = projectIssues.filter(i => i.statusCategory !== 'DONE');
  const urgentCount = projectIssues.filter(i => i.priority === 'URGENT' || i.severity === 'BLOCKER').length;
  const inProgressCount = projectIssues.filter(i => i.statusCategory === 'IN_PROGRESS').length;
  const activeRelease = releases[0];

  return (
    <div className="space-y-6">
      {/* Welcome Hero Banner */}
      <div className="p-6 bg-gradient-to-r from-white via-[#f5f0e6] to-[#eae3d2] dark:from-[#1c1b18] dark:via-[#262420] dark:to-[#121110] border border-[#e7e2d6] dark:border-[#33302a] rounded-3xl shadow-xs flex items-center justify-between">
        <div className="space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-[#aacc11] dark:text-[#d4f033] flex items-center gap-2">
            <span>Current Workspace:</span>
            <span className="font-mono bg-[#ccee22]/30 text-[#1c1917] dark:text-[#d4f033] px-2 py-0.5 rounded-md font-bold">
              {selectedProject.key} — {selectedProject.name}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#1c1917] dark:text-white tracking-tight">
            Good day, {currentUser?.displayName || 'Engineer'} 👋
          </h1>
          <p className="text-xs text-[#78716c] max-w-lg">
            {openIssues.length} active issues in <span className="font-semibold text-[#1c1917] dark:text-white">{selectedProject.name}</span>. {selectedProject.description}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <BugMascot state="happy" size={54} interactive className="animate-bug-bounce" />
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 bg-[#ccee22] hover:bg-[#b8dd11] text-[#1c1917] text-xs font-bold rounded-2xl shadow-xs flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Create Defect</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-4 gap-4 select-none">
        <div className="p-4 bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-2xl shadow-2xs">
          <span className="text-[11px] font-bold text-[#78716c] uppercase">Project Issues ({selectedProject.key})</span>
          <div className="text-2xl font-black text-[#1c1917] dark:text-white mt-1">{openIssues.length}</div>
          <span className="text-[10px] text-[#10b981] font-semibold">{projectIssues.length} total recorded</span>
        </div>

        <div className="p-4 bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-2xl shadow-2xs">
          <span className="text-[11px] font-bold text-[#78716c] uppercase">Urgent & Blocker</span>
          <div className="text-2xl font-black text-[#ff6b57] mt-1">{urgentCount}</div>
          <span className="text-[10px] text-[#ff6b57] font-semibold">Requires immediate review</span>
        </div>

        <div className="p-4 bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-2xl shadow-2xs">
          <span className="text-[11px] font-bold text-[#78716c] uppercase">In Progress</span>
          <div className="text-2xl font-black text-[#3b82f6] mt-1">{inProgressCount}</div>
          <span className="text-[10px] text-[#3b82f6] font-semibold">Under active engineering</span>
        </div>

        <div className="p-4 bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-2xl shadow-2xs">
          <span className="text-[11px] font-bold text-[#78716c] uppercase">CI Build Pass Rate</span>
          <div className="text-2xl font-black text-[#10b981] mt-1">{activeRelease?.ciPassRate || 98}%</div>
          <span className="text-[10px] text-[#10b981] font-semibold">Healthy release status</span>
        </div>
      </div>

      {/* 2-Column Split: Active Issues & AI Intelligence Insights */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left 2 Cols: High Priority Issues Feed */}
        <div className="col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#78716c]">
              Needs Attention in {selectedProject.key} ({openIssues.length})
            </h2>
            <button
              onClick={() => setActiveTab('issues')}
              className="text-xs font-semibold text-[#aacc11] dark:text-[#d4f033] hover:underline cursor-pointer"
            >
              View all {selectedProject.key} issues →
            </button>
          </div>

          <div className="space-y-2">
            {openIssues.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-2xl space-y-2">
                <BugMascot state="sleeping" size={36} className="mx-auto" />
                <div className="text-xs font-bold text-[#1c1917] dark:text-white">All clear for {selectedProject.key}!</div>
                <p className="text-[11px] text-[#78716c]">No open defects currently pending for this project.</p>
              </div>
            ) : (
              openIssues.slice(0, 4).map(issue => (
                <div
                  key={issue.id}
                  onClick={() => setSelectedIssue(issue)}
                  onMouseEnter={playHoverSound}
                  className="p-3.5 bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-2xl shadow-2xs hover:shadow-md cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="space-y-1 max-w-lg truncate">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[#aacc11] dark:text-[#d4f033]">
                        {issue.key}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${issue.priority === 'URGENT' ? 'bg-[#ff6b57]/20 text-[#ff6b57]' : 'bg-[#f5f0e6] dark:bg-[#262420] text-[#78716c]'}`}>
                        {issue.priority}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-[#1c1917] dark:text-white group-hover:underline truncate">
                      {issue.title}
                    </h3>
                  </div>

                  <div className="text-right">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#3b82f6]/15 text-[#3b82f6]">
                      {issue.status}
                    </span>
                    <div className="text-[10px] text-[#a8a29e] mt-1">{issue.assigneeName}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Col: AI Suggestions & Release Health */}
        <div className="space-y-4">
          {/* AI Intelligence Spotlight */}
          <div className="p-4 bg-gradient-to-br from-[#8b5cf6]/10 to-transparent border border-[#8b5cf6]/30 rounded-3xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#8b5cf6]">
              <SparklesIcon className="w-4 h-4" />
              <span>AI Triage & Deduplication</span>
            </div>
            <p className="text-xs text-[#78716c] leading-relaxed">
              Auditing defects in <span className="font-semibold">{selectedProject.key}</span>. Embeddings cached with semantic search ready.
            </p>
            <button
              onClick={() => setActiveTab('ai')}
              className="w-full py-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              Open AI Workbench
            </button>
          </div>

          {/* Active Release Milestone Card */}
          <div className="p-4 bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-3xl space-y-3">
            {activeRelease ? (
              <>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#1c1917] dark:text-white">{activeRelease.name}</span>
                  <span className="font-bold text-[10px] px-2 py-0.5 rounded-full bg-[#10b981]/20 text-[#10b981]">
                    {activeRelease.health}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#78716c]">
                    <span>Progress</span>
                    <span className="font-bold">{projectIssues.filter(i => i.statusCategory === 'DONE').length} / {projectIssues.length} resolved</span>
                  </div>
                  <div className="w-full h-2 bg-[#f5f0e6] dark:bg-[#262420] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#ccee22]"
                      style={{ width: `${projectIssues.length > 0 ? (projectIssues.filter(i => i.statusCategory === 'DONE').length / projectIssues.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#1c1917] dark:text-white">Milestone Burndown</span>
                  <span className="text-[10px] text-[#78716c]">v1.0.0</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#78716c]">
                    <span>Sprint Status</span>
                    <span className="font-bold">{projectIssues.filter(i => i.statusCategory === 'DONE').length} / {projectIssues.length} resolved</span>
                  </div>
                  <div className="w-full h-2 bg-[#f5f0e6] dark:bg-[#262420] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#ccee22]"
                      style={{ width: `${projectIssues.length > 0 ? (projectIssues.filter(i => i.statusCategory === 'DONE').length / projectIssues.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
