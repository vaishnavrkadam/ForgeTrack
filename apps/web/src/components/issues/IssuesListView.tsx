'use client';

import React from 'react';
import { useStore } from '../../lib/store';
import { useSound } from '../sound/SoundProvider';
import { BugMascot } from '../mascot/BugMascot';
import { PlusIcon, SearchIcon } from '../ui/Icons';

export const IssuesListView: React.FC = () => {
  const {
    issues,
    selectedProject,
    setSelectedIssue,
    setIsCreateModalOpen,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    filterPriority,
    setFilterPriority,
  } = useStore();

  const { playHoverSound } = useSound();

  if (!selectedProject) return null;

  const filteredIssues = issues.filter(issue => {
    const matchSearch =
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.labels.some(l => l.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchType = filterType === 'ALL' || issue.type === filterType;
    const matchPriority = filterPriority === 'ALL' || issue.priority === filterPriority;

    return matchSearch && matchType && matchPriority;
  });

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="flex items-center justify-between gap-3 bg-white dark:bg-[#1c1b18] p-3 rounded-2xl border border-[#e7e2d6] dark:border-[#33302a] shadow-2xs">
        <div className="flex items-center gap-3 flex-1">
          {/* Project Indicator Badge */}
          <div className="px-2.5 py-1 bg-[#ccee22]/20 border border-[#ccee22]/40 rounded-xl text-xs font-bold text-[#1c1917] dark:text-[#d4f033] flex items-center gap-1.5 shrink-0">
            <span>{selectedProject.key}</span>
            <span className="text-[#78716c] font-normal">({filteredIssues.length})</span>
          </div>

          <div className="relative flex-1 max-w-sm">
            <SearchIcon className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#78716c]" />
            <input
              type="text"
              placeholder={`Filter ${selectedProject.key} issues by keyword, title, #label...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#f5f0e6] dark:bg-[#262420] rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-xs text-[#1c1917] dark:text-white focus:outline-none"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="bg-[#f5f0e6] dark:bg-[#262420] text-xs font-semibold px-3 py-1.5 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-[#1c1917] dark:text-white focus:outline-none"
          >
            <option value="ALL">All Types</option>
            <option value="BUG">🐛 Bug</option>
            <option value="FEATURE">✨ Feature</option>
            <option value="TASK">📋 Task</option>
          </select>

          {/* Priority Filter */}
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="bg-[#f5f0e6] dark:bg-[#262420] text-xs font-semibold px-3 py-1.5 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-[#1c1917] dark:text-white focus:outline-none"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">🔴 Urgent</option>
            <option value="HIGH">🟠 High</option>
            <option value="MEDIUM">🟡 Medium</option>
            <option value="LOW">🟢 Low</option>
          </select>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-3.5 py-1.5 bg-[#ccee22] hover:bg-[#b8dd11] text-[#1c1917] text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-transform active:scale-95 shrink-0 cursor-pointer"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span>New {selectedProject.key} Issue</span>
        </button>
      </div>

      {/* Issues Table */}
      {filteredIssues.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-3xl space-y-3">
          <BugMascot state="sleeping" size={56} className="mx-auto" />
          <h3 className="text-base font-bold text-[#1c1917] dark:text-white">No bugs found in {selectedProject.name}!</h3>
          <p className="text-xs text-[#78716c] max-w-sm mx-auto">
            Either everything is running smoothly, or no issues match your filters for {selectedProject.key}.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterType('ALL');
              setFilterPriority('ALL');
            }}
            className="px-4 py-1.5 bg-[#f5f0e6] dark:bg-[#262420] hover:bg-[#e7e2d6] text-xs font-semibold rounded-xl text-[#1c1917] dark:text-white cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-2xl overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#fbf9f5] dark:bg-[#121110] border-b border-[#e7e2d6] dark:border-[#33302a] text-[#78716c] uppercase text-[10px] font-bold tracking-wider select-none">
              <tr>
                <th className="py-3 px-4">Key</th>
                <th className="py-3 px-4">Summary</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Component</th>
                <th className="py-3 px-4">Assignee</th>
                <th className="py-3 px-4 text-right">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e7e2d6] dark:divide-[#33302a]">
              {filteredIssues.map(issue => (
                <tr
                  key={issue.id}
                  onClick={() => setSelectedIssue(issue)}
                  onMouseEnter={playHoverSound}
                  className="hover:bg-[#fbf9f5] dark:hover:bg-[#262420]/50 cursor-pointer transition-colors group"
                >
                  <td className="py-3 px-4 font-mono font-bold text-[#aacc11] dark:text-[#d4f033]">
                    {issue.key}
                  </td>
                  <td className="py-3 px-4 font-medium text-[#1c1917] dark:text-[#f5f5f4] max-w-md truncate">
                    <span className="group-hover:underline">{issue.title}</span>
                    <div className="flex gap-1 mt-0.5">
                      {issue.labels.map((l, i) => (
                        <span key={i} className="text-[9px] px-1.5 py-0.2 bg-[#f5f0e6] dark:bg-[#262420] text-[#78716c] rounded">
                          #{l}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        issue.statusCategory === 'DONE'
                          ? 'bg-[#10b981]/15 text-[#10b981]'
                          : issue.statusCategory === 'IN_PROGRESS'
                          ? 'bg-[#3b82f6]/15 text-[#3b82f6]'
                          : 'bg-[#f59e0b]/15 text-[#f59e0b]'
                      }`}
                    >
                      {issue.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`font-semibold ${
                        issue.priority === 'URGENT'
                          ? 'text-[#ff6b57]'
                          : issue.priority === 'HIGH'
                          ? 'text-[#f59e0b]'
                          : 'text-[#78716c]'
                      }`}
                    >
                      {issue.priority}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#78716c] font-medium">
                    {issue.severity}
                  </td>
                  <td className="py-3 px-4 text-[#78716c]">
                    {issue.component || 'General'}
                  </td>
                  <td className="py-3 px-4 text-[#1c1917] dark:text-[#f5f5f4] font-medium">
                    {issue.assigneeName || 'Unassigned'}
                  </td>
                  <td className="py-3 px-4 text-right text-[#a8a29e] text-[11px]">
                    {new Date(issue.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
