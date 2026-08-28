'use client';

import React from 'react';
import { useStore } from '../../lib/store';
import { useSound } from '../sound/SoundProvider';
import { BugMascot } from '../mascot/BugMascot';

export const KanbanBoardView: React.FC = () => {
  const { issues, selectedProject, setSelectedIssue, updateIssueStatus } = useStore();
  const { playSuccessSound, playHoverSound } = useSound();

  const columns = [
    { id: 'OPEN', label: 'To Do / Open', category: 'TODO' as const, color: '#f59e0b', nextStatus: 'IN PROGRESS', nextCategory: 'IN_PROGRESS' as const },
    { id: 'IN PROGRESS', label: 'In Progress', category: 'IN_PROGRESS' as const, color: '#3b82f6', nextStatus: 'RESOLVED', nextCategory: 'DONE' as const },
    { id: 'RESOLVED', label: 'Resolved / Verified', category: 'DONE' as const, color: '#10b981', nextStatus: 'CLOSED', nextCategory: 'DONE' as const },
    { id: 'CLOSED', label: 'Closed', category: 'DONE' as const, color: '#a8a29e', nextStatus: null, nextCategory: null },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#78716c]">Kanban Board:</span>
          <span className="text-xs font-mono font-bold bg-[#ccee22]/20 text-[#1c1917] dark:text-[#d4f033] px-2 py-0.5 rounded-md">
            {selectedProject.key} — {selectedProject.name}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 select-none min-h-[70vh]">
        {columns.map(col => {
          const columnIssues = issues.filter(i => i.status === col.id && i.key.startsWith(selectedProject.key));

          return (
            <div
              key={col.id}
              className="bg-[#f5f0e6]/50 dark:bg-[#1c1b18]/60 rounded-3xl p-3.5 border border-[#e7e2d6] dark:border-[#33302a] flex flex-col"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#e7e2d6] dark:border-[#33302a]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                  <h3 className="text-xs font-bold text-[#1c1917] dark:text-white uppercase tracking-wider">
                    {col.label}
                  </h3>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-white dark:bg-[#262420] text-[#78716c] rounded-full border border-[#e7e2d6] dark:border-[#33302a]">
                  {columnIssues.length}
                </span>
              </div>

              {/* Column Cards */}
              <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
                {columnIssues.map(issue => (
                  <div
                    key={issue.id}
                    onClick={() => setSelectedIssue(issue)}
                    onMouseEnter={playHoverSound}
                    className="p-3 bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-2xl shadow-2xs hover:shadow-md hover:border-[#d6cfbe] cursor-pointer transition-all group"
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="font-mono font-bold text-[#aacc11] dark:text-[#d4f033]">
                        {issue.key}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${issue.priority === 'URGENT' ? 'bg-[#ff6b57]/20 text-[#ff6b57]' : 'bg-[#f5f0e6] dark:bg-[#262420] text-[#78716c]'}`}>
                        {issue.priority}
                      </span>
                    </div>

                    <h4 className="text-xs font-semibold text-[#1c1917] dark:text-[#f5f5f4] group-hover:underline line-clamp-2 mb-2">
                      {issue.title}
                    </h4>

                    <div className="flex items-center justify-between pt-2 border-t border-[#f5f0e6] dark:border-[#262420] text-[10px] text-[#78716c]">
                      <span>{issue.component || 'General'}</span>
                      <div className="flex items-center gap-1.5">
                        {col.nextStatus && col.nextCategory && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateIssueStatus(issue.id, col.nextStatus!, col.nextCategory!);
                              playSuccessSound();
                            }}
                            className="px-1.5 py-0.5 bg-[#f5f0e6] dark:bg-[#262420] hover:bg-[#ccee22] hover:text-[#1c1917] rounded text-[9px] font-bold transition-colors"
                            title={`Move to ${col.nextStatus}`}
                          >
                            →
                          </button>
                        )}
                        <div className="w-4 h-4 rounded-full bg-[#ff7a38] text-white text-[9px] font-bold flex items-center justify-center">
                          {issue.assigneeName?.[0] || 'U'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {columnIssues.length === 0 && (
                  <div className="h-32 flex flex-col items-center justify-center text-center p-4 border border-dashed border-[#e7e2d6] dark:border-[#33302a] rounded-2xl">
                    <BugMascot state="sleeping" size={24} />
                    <span className="text-[11px] text-[#a8a29e] mt-1">Quiet in {selectedProject.key}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
