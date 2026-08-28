'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '../../lib/store';
import { useSound } from '../sound/SoundProvider';
import { useCursor } from '../cursor/BugCursor';
import { BugMascot } from '../mascot/BugMascot';
import { SearchIcon, SparklesIcon, PlusIcon, CloseIcon } from '../ui/Icons';

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    setActiveTab,
    setIsCreateModalOpen,
    issues,
    setSelectedIssue,
  } = useStore();

  const { setSoundEnabled, soundEnabled } = useSound();
  const { setCursorMode, cursorMode } = useCursor();
  const [query, setQuery] = useState('');

  // Keyboard shortcut listener for Cmd+K and C
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(!isCommandPaletteOpen);
      }
      if (e.key.toLowerCase() === 'c' && !isCommandPaletteOpen && (e.target as HTMLElement)?.tagName !== 'INPUT' && (e.target as HTMLElement)?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setIsCreateModalOpen(true);
      }
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        setIsCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const filteredIssues = issues.filter(
    i => i.title.toLowerCase().includes(query.toLowerCase()) || i.key.toLowerCase().includes(query.toLowerCase()),
  );

  const actions = [
    { label: 'Create New Issue', icon: PlusIcon, run: () => setIsCreateModalOpen(true) },
    { label: 'Open AI Workbench', icon: SparklesIcon, run: () => setActiveTab('ai') },
    { label: `Toggle Sound Effects (${soundEnabled ? 'Disable' : 'Enable'})`, icon: SparklesIcon, run: () => setSoundEnabled(!soundEnabled) },
    { label: `Toggle Bug Cursor (${cursorMode === 'bug' ? 'Default' : 'Bug'})`, icon: SparklesIcon, run: () => setCursorMode(cursorMode === 'bug' ? 'default' : 'bug') },
    { label: 'View Releases & CI Runs', icon: SparklesIcon, run: () => setActiveTab('releases') },
    { label: 'Open Integrations & Git Settings', icon: SparklesIcon, run: () => setActiveTab('integrations') },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-start justify-center pt-24 p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="p-3 border-b border-[#e7e2d6] dark:border-[#33302a] flex items-center gap-3 bg-[#fbf9f5] dark:bg-[#121110]">
          <SearchIcon className="w-4 h-4 text-[#78716c]" />
          <input
            type="text"
            placeholder="Type a command or search issues..."
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm focus:outline-none text-[#1c1917] dark:text-white"
          />
          <button
            onClick={() => setIsCommandPaletteOpen(false)}
            className="text-[#78716c] hover:text-[#1c1917] dark:hover:text-white p-1 rounded-lg"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Command & Search Results */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {/* Quick Actions */}
          <div className="px-3 py-1.5 text-[11px] font-bold text-[#a8a29e] uppercase tracking-wider">
            Quick Actions
          </div>
          {actions.map((act, i) => {
            const Icon = act.icon;
            return (
              <div
                key={i}
                onClick={() => {
                  act.run();
                  setIsCommandPaletteOpen(false);
                }}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold hover:bg-[#f5f0e6] dark:hover:bg-[#262420] text-[#1c1917] dark:text-[#f5f5f4] cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-[#8b5cf6]" />
                  <span>{act.label}</span>
                </div>
                <span className="text-[10px] text-[#a8a29e] font-mono">↵ select</span>
              </div>
            );
          })}

          {/* Issue Matches */}
          {filteredIssues.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[11px] font-bold text-[#a8a29e] uppercase tracking-wider mt-2">
                Issues ({filteredIssues.length})
              </div>
              {filteredIssues.slice(0, 5).map(issue => (
                <div
                  key={issue.id}
                  onClick={() => {
                    setSelectedIssue(issue);
                    setIsCommandPaletteOpen(false);
                  }}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs hover:bg-[#f5f0e6] dark:hover:bg-[#262420] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono font-bold text-[#aacc11] dark:text-[#d4f033]">
                      {issue.key}
                    </span>
                    <span className="truncate text-[#1c1917] dark:text-[#f5f5f4]">{issue.title}</span>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#e7e2d6] dark:bg-[#33302a] text-[#78716c]">
                    {issue.status}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 bg-[#f5f0e6] dark:bg-[#262420] border-t border-[#e7e2d6] dark:border-[#33302a] flex items-center justify-between text-[11px] text-[#78716c]">
          <div className="flex items-center gap-2">
            <BugMascot state="thinking" size={18} />
            <span>Navigation: ↑↓, Select: ↵, Dismiss: Esc</span>
          </div>
          <span className="font-semibold text-[#8b5cf6]">AI Semantic Index Ready</span>
        </div>
      </div>
    </div>
  );
};
