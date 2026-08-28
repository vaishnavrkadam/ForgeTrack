'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../lib/store';
import { useSound } from '../sound/SoundProvider';
import { useCursor } from '../cursor/BugCursor';
import { BugMascot } from '../mascot/BugMascot';
import { NotificationBell } from './NotificationBell';
import { SearchIcon, PlusIcon, SparklesIcon } from '../ui/Icons';

export const TopBar: React.FC = () => {
  const {
    projects,
    selectedProject,
    setSelectedProject,
    setIsCreateModalOpen,
    setIsCommandPaletteOpen,
    setIsInviteModalOpen,
    searchQuery,
    setSearchQuery,
    currentUser,
    currentOrg,
    logout,
    setIsAuthModalOpen,
    setViewMode,
    setActiveTab,
  } = useStore();

  const { soundEnabled, setSoundEnabled, playClickSound } = useSound();
  const { cursorMode, setCursorMode } = useCursor();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase() || 'FT';
  };

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
        {projects && projects.length > 0 ? (
          <select
            value={selectedProject?.id || ''}
            onChange={(e) => {
              if (e.target.value === '__create_new__') {
                setActiveTab('onboarding');
                return;
              }
              const found = projects.find(p => p.id === e.target.value);
              if (found) setSelectedProject(found);
            }}
            className="bg-[#f5f0e6] dark:bg-[#262420] text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-[#e7e2d6] dark:border-[#33302a] text-[#1c1917] dark:text-[#f5f5f4] cursor-pointer hover:border-[#d6cfbe] transition-colors focus:outline-none max-w-[200px] truncate"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.key} — {p.name}
              </option>
            ))}
            <option value="__create_new__">+ Create / Join Project...</option>
          </select>
        ) : (
          <button
            onClick={() => setActiveTab('onboarding')}
            className="px-2.5 py-1 bg-[#ccee22]/20 border border-[#ccee22]/40 rounded-lg text-xs font-bold text-[#1c1917] dark:text-[#d4f033]"
          >
            + Create Project
          </button>
        )}
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
      <div className="flex items-center gap-2">
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

        {/* Live Notification Bell */}
        <NotificationBell />

        {/* AI Quick Sparkle */}
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className="p-1.5 text-[#8b5cf6] hover:bg-[#8b5cf6]/10 rounded-lg transition-colors"
          title="AI Assistant Active"
        >
          <SparklesIcon className="w-4 h-4" />
        </button>

        {/* Create Issue Button */}
        {selectedProject && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-[#ccee22] hover:bg-[#b8dd11] active:scale-95 text-[#1c1917] font-bold text-xs px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-transform"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>New Issue</span>
          </button>
        )}

        {/* Profile Avatar / Login Button */}
        {currentUser ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => {
                playClickSound();
                setIsProfileMenuOpen(!isProfileMenuOpen);
              }}
              className="flex items-center gap-2 pl-1 pr-2 py-1 bg-[#f5f0e6] dark:bg-[#262420] border border-[#e7e2d6] dark:border-[#33302a] hover:border-[#d6cfbe] rounded-full transition-all cursor-pointer"
            >
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.displayName}
                  className="w-7 h-7 rounded-full object-cover border border-[#e7e2d6] dark:border-[#33302a]"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#ff7a38] to-[#ff6b57] text-white text-xs font-bold flex items-center justify-center shadow-xs">
                  {getInitials(currentUser.displayName)}
                </div>
              )}
              <span className="text-xs font-bold text-[#1c1917] dark:text-white max-w-[100px] truncate">
                {currentUser.displayName}
              </span>
              <span className="text-[10px] text-[#78716c]">▼</span>
            </button>

            {/* Dropdown Menu */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-2xl shadow-xl p-2 z-50 animate-fade-in space-y-1">
                <div className="px-3 py-2 border-b border-[#f5f0e6] dark:border-[#262420]">
                  <div className="text-xs font-bold text-[#1c1917] dark:text-white">{currentUser.displayName}</div>
                  <div className="text-[11px] text-[#78716c] truncate">{currentUser.email}</div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#ccee22]/30 text-[#1c1917] dark:text-[#d4f033] rounded font-bold uppercase">
                      {currentUser.oauthProvider || currentUser.provider}
                    </span>
                    <span className="text-[10px] text-[#a8a29e]">• {currentOrg?.name || currentUser.role}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    setIsInviteModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-[#1c1917] dark:text-white hover:bg-[#f5f0e6] dark:hover:bg-[#262420] rounded-xl transition-colors cursor-pointer flex items-center justify-between"
                >
                  <span>✉️ Invite Teammates</span>
                  <span className="text-[10px] text-[#10b981] font-bold">New</span>
                </button>

                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    setActiveTab('settings');
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-[#1c1917] dark:text-white hover:bg-[#f5f0e6] dark:hover:bg-[#262420] rounded-xl transition-colors cursor-pointer"
                >
                  ⚙️ Settings & Audit Logs
                </button>

                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    setViewMode('landing');
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-[#1c1917] dark:text-white hover:bg-[#f5f0e6] dark:hover:bg-[#262420] rounded-xl transition-colors cursor-pointer"
                >
                  🏠 Landing Page
                </button>

                <div className="h-px bg-[#e7e2d6] dark:bg-[#33302a] my-1" />

                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-[#ef4444] hover:bg-[#ef4444]/10 rounded-xl transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span>Sign Out</span>
                  <span>⎋</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="px-3.5 py-1.5 bg-[#1c1917] dark:bg-white text-white dark:text-[#1c1917] text-xs font-bold rounded-xl shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
};
