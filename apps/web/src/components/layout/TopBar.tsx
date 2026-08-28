'use client';

import React from 'react';
import { useStore } from '../../lib/store';
import { useSound } from '../sound/SoundProvider';
import { useCursor } from '../cursor/BugCursor';
import { BugMascot } from '../mascot/BugMascot';
import { SearchIcon, PlusIcon, SparklesIcon } from '../ui/Icons';

export const TopBar: React.FC = () => {
  const {
    projects,
    selectedProject,
    setSelectedProject,
    setIsCreateModalOpen,
    setIsCommandPaletteOpen,
    searchQuery,
    setSearchQuery,
  } = useStore();

  const { soundEnabled, setSoundEnabled } = useSound();
  const { cursorMode, setCursorMode } = useCursor();

  return (
    <header className="h-14 border-b border-[#e7e2d6] dark:border-[#33302a] bg-white dark:bg-[#1c1b18] px-4 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Left: Brand + Project Switcher */}
      <div className="flex items-center gap-4">
        <div
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => setIsCommandPaletteOpen(true)}
          title="ForgeTrack (Cmd+K)"
        >
          <div className="relative">
            <BugMascot state="happy" size={28} className="transform group-hover:rotate-12 transition-transform duration-200" />
            <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
          </div>
          <span className="font-bold text-lg tracking-tight text-[#1c1917] dark:text-[#f5f5f4]">
            Forge<span className="text-[#aacc11] dark:text-[#d4f033]">Track</span>
          </span>
        </div>

        <div className="h-4 w-px bg-[#e7e2d6] dark:bg-[#33302a]" />

        {/* Project Selector */}
        <select
          value={selectedProject.id}
          onChange={(e) => {
            const found = projects.find(p => p.id === e.target.value);
            if (found) setSelectedProject(found);
          }}
          className="bg-[#f5f0e6] dark:bg-[#262420] text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-[#e7e2d6] dark:border-[#33302a] text-[#1c1917] dark:text-[#f5f5f4] cursor-pointer hover:border-[#d6cfbe] transition-colors focus:outline-none"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.key} — {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Center: Global Search Bar */}
      <div className="flex-1 max-w-md mx-6">
        <div
          onClick={() => setIsCommandPaletteOpen(true)}
          className="relative flex items-center bg-[#f5f0e6] dark:bg-[#262420] border border-[#e7e2d6] dark:border-[#33302a] rounded-xl px-3 py-1.5 text-xs text-[#78716c] cursor-pointer hover:border-[#d6cfbe] transition-all group"
        >
          <SearchIcon className="w-3.5 h-3.5 mr-2 text-[#78716c] group-hover:text-[#1c1917] dark:group-hover:text-white" />
          <input
            type="text"
            placeholder="Search issues, keys, labels or natural query... (/ or Cmd+K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent flex-1 focus:outline-none text-[#1c1917] dark:text-white placeholder-[#78716c]"
          />
          <kbd className="text-[10px] bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] px-1.5 py-0.5 rounded text-[#78716c] font-mono shadow-2xs">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: Quick Actions + Preferences + Profile */}
      <div className="flex items-center gap-2.5">
        {/* Toggle Sound Chip */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${
            soundEnabled
              ? 'bg-[#f5f0e6] dark:bg-[#262420] text-[#1c1917] dark:text-[#f5f5f4] border-[#e7e2d6] dark:border-[#33302a]'
              : 'bg-transparent text-[#a8a29e] border-transparent hover:border-[#e7e2d6]'
          }`}
          title="Toggle UI Sound Effects"
        >
          <span>{soundEnabled ? '🔊 Sound On' : '🔇 Muted'}</span>
        </button>

        {/* Toggle Cursor Chip */}
        <button
          onClick={() => setCursorMode(cursorMode === 'bug' ? 'default' : 'bug')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${
            cursorMode === 'bug'
              ? 'bg-[#ccee22]/30 text-[#1c1917] dark:text-[#d4f033] border-[#ccee22]/50'
              : 'bg-transparent text-[#a8a29e] border-transparent hover:border-[#e7e2d6]'
          }`}
          title="Toggle Bug Pointer Mascot"
        >
          <span>🐛 {cursorMode === 'bug' ? 'Bug Cursor' : 'Default'}</span>
        </button>

        {/* AI Quick Sparkle */}
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className="p-1.5 text-[#8b5cf6] hover:bg-[#8b5cf6]/10 rounded-lg transition-colors"
          title="AI Assistant Active"
        >
          <SparklesIcon className="w-4 h-4" />
        </button>

        {/* Create Issue Button */}
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-[#ccee22] hover:bg-[#b8dd11] active:scale-95 text-[#1c1917] font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-transform"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span>New Issue</span>
          <kbd className="text-[10px] bg-black/10 px-1 py-0.2 rounded font-mono">C</kbd>
        </button>

        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#ff7a38] to-[#ff6b57] text-white text-xs font-bold flex items-center justify-center shadow-xs border-2 border-white dark:border-[#1c1b18]">
          AC
        </div>
      </div>
    </header>
  );
};
