'use client';

import React from 'react';
import { useStore } from '../../lib/store';
import { BugMascot } from '../mascot/BugMascot';

export const ReleasesView: React.FC = () => {
  const { releases, ciRuns, selectedProject } = useStore();

  return (
    <div className="space-y-6 select-none">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1c1917] dark:text-white">Releases & CI Intelligence</h1>
          <p className="text-xs text-[#78716c]">Release health monitoring, automated build tracking, and blocker defect alerts.</p>
        </div>
      </div>

      {/* Release Versions Cards */}
      {releases.length === 0 ? (
        <div className="p-8 bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-3xl text-center space-y-2 shadow-2xs">
          <BugMascot state="happy" size={36} className="mx-auto" />
          <h3 className="font-bold text-sm text-[#1c1917] dark:text-white">No active release milestones</h3>
          <p className="text-xs text-[#78716c] max-w-sm mx-auto">
            Create milestone versions or sync release tags for {selectedProject?.key || 'your project'} to track release quality and blocker defect burndown.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {releases.map(rel => {
            const percent = rel.totalIssues > 0 ? Math.round((rel.doneIssues / rel.totalIssues) * 100) : 0;
            return (
              <div
                key={rel.id}
                className="p-5 bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-3xl space-y-4 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-[#1c1917] dark:text-white">{rel.name}</h3>
                    <span className="text-[11px] text-[#78716c]">Target Date: {rel.releaseDate}</span>
                  </div>
                  <span
                    className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                      rel.health === 'HEALTHY'
                        ? 'bg-[#10b981]/20 text-[#10b981]'
                        : 'bg-[#ff6b57]/20 text-[#ff6b57]'
                    }`}
                  >
                    {rel.health}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-[#78716c]">Sprint Progress</span>
                    <span className="text-[#1c1917] dark:text-white">{percent}% ({rel.doneIssues}/{rel.totalIssues} resolved)</span>
                  </div>
                  <div className="w-full h-3 bg-[#f5f0e6] dark:bg-[#262420] rounded-full overflow-hidden">
                    <div className="h-full bg-[#ccee22]" style={{ width: `${percent}%` }} />
                  </div>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#e7e2d6] dark:border-[#33302a] text-center text-xs">
                  <div>
                    <span className="text-[#78716c] text-[10px] uppercase font-bold block">CI Pass Rate</span>
                    <span className="font-bold text-[#10b981]">{rel.ciPassRate}%</span>
                  </div>
                  <div>
                    <span className="text-[#78716c] text-[10px] uppercase font-bold block">Blockers</span>
                    <span className={`font-bold ${rel.blockingDefects > 0 ? 'text-[#ff6b57]' : 'text-[#78716c]'}`}>
                      {rel.blockingDefects}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#78716c] text-[10px] uppercase font-bold block">Status</span>
                    <span className="font-bold text-[#1c1917] dark:text-white">{rel.status}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Linked CI Build Runs */}
      <div className="bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-3xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BugMascot state="working" size={24} />
            <h3 className="font-bold text-sm text-[#1c1917] dark:text-white">Recent CI / Release Runs</h3>
          </div>
          <span className="text-xs text-[#78716c]">Automated commit integration</span>
        </div>

        {ciRuns.length === 0 ? (
          <div className="p-6 bg-[#fbf9f5] dark:bg-[#121110] border border-[#e7e2d6] dark:border-[#33302a] rounded-2xl text-center text-xs text-[#78716c]">
            No CI runs recorded yet. Connect your GitHub repository webhook to stream real-time build and test statuses.
          </div>
        ) : (
          <div className="space-y-2">
            {ciRuns.map(run => (
              <div
                key={run.id}
                className="p-3 bg-[#fbf9f5] dark:bg-[#121110] border border-[#e7e2d6] dark:border-[#33302a] rounded-2xl flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-[#3b82f6]">commit:{run.commitSha}</span>
                  <span className="font-semibold text-[#1c1917] dark:text-white">{run.workflowName}</span>
                  <span className="text-[#78716c] text-[11px]">{run.startedAt}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      run.status === 'SUCCESS'
                        ? 'bg-[#10b981]/20 text-[#10b981]'
                        : 'bg-[#3b82f6]/20 text-[#3b82f6] animate-pulse'
                    }`}
                  >
                    {run.status}
                  </span>
                  <a
                    href={run.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[#78716c] hover:text-[#1c1917] dark:hover:text-white underline font-medium"
                  >
                    Logs ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
