'use client';

import React from 'react';
import { useStore } from '../../lib/store';
import { useSound } from '../sound/SoundProvider';
import { BugMascot } from '../mascot/BugMascot';
import { SparklesIcon } from '../ui/Icons';
import { normalizeApiUrl } from '../../lib/api';

export const LandingPage: React.FC = () => {
  const { setIsAuthModalOpen, setViewMode, currentUser } = useStore();
  const { playClickSound } = useSound();

  const handleLaunchApp = () => {
    playClickSound();
    if (currentUser) {
      setViewMode('app');
    } else {
      setIsAuthModalOpen(true);
    }
  };

  const handleOAuthLogin = (provider: 'github' | 'google') => {
    playClickSound();
    const apiUrl = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);
    const returnOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const stateParam = returnOrigin ? `?state=${encodeURIComponent(returnOrigin)}` : '';

    if (provider === 'github') {
      window.location.href = `${apiUrl}/auth/github${stateParam}`;
    } else {
      window.location.href = `${apiUrl}/auth/google${stateParam}`;
    }
  };

  return (
    <div className="min-h-screen bg-[#fbf9f5] dark:bg-[#121110] text-[#1c1917] dark:text-[#f5f5f4] selection:bg-[#ccee22] selection:text-black">
      {/* Navigation Header */}
      <header className="h-16 border-b border-[#e7e2d6] dark:border-[#33302a] bg-white/80 dark:bg-[#1c1b18]/80 backdrop-blur-md sticky top-0 z-40 px-6 max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BugMascot state="happy" size={32} />
          <span className="font-extrabold text-xl tracking-tight">
            Forge<span className="text-[#aacc11] dark:text-[#d4f033]">Track</span>
          </span>
          <span className="text-[11px] font-mono font-bold bg-[#ccee22]/30 text-[#1c1917] dark:text-[#d4f033] px-2 py-0.5 rounded-full">
            v2.0
          </span>
        </div>

        <div className="flex items-center gap-3">
          {currentUser ? (
            <button
              onClick={() => setViewMode('app')}
              className="px-4 py-2 bg-[#ccee22] hover:bg-[#b8dd11] active:scale-95 text-[#1c1917] text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Open Workspace ({currentUser.displayName})</span>
              <span>→</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  playClickSound();
                  setIsAuthModalOpen(true);
                }}
                className="px-3.5 py-1.5 text-xs font-bold text-[#78716c] hover:text-[#1c1917] dark:hover:text-white transition-colors cursor-pointer"
              >
                Sign In
              </button>

              <button
                onClick={() => {
                  playClickSound();
                  setIsAuthModalOpen(true);
                }}
                className="px-4 py-2 bg-[#1c1917] dark:bg-white hover:bg-black dark:hover:bg-[#f0ece1] text-white dark:text-[#1c1917] text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                Get Started
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="max-w-6xl mx-auto px-6 pt-16 pb-24 space-y-20">
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] shadow-xs text-xs font-semibold text-[#78716c]">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
            <span>Modern engineering issue tracking built for velocity</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-[#1c1917] dark:text-white leading-[1.1]">
            Track defects with precision. <br />
            <span className="bg-gradient-to-r from-[#84a900] via-[#aacc11] to-[#ff7a38] bg-clip-text text-transparent">
              Eliminate software friction.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-[#78716c] dark:text-[#a8a29e] max-w-2xl mx-auto leading-relaxed">
            The next-generation evolution of Bugzilla. Built with sub-second keyboard ergonomics, AI duplicate intelligence, release health indicators, and bi-directional Git workflows.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => handleOAuthLogin('github')}
              className="px-5 py-3 bg-[#24292f] hover:bg-[#1b1f23] text-white text-xs font-bold rounded-2xl flex items-center gap-2.5 shadow-sm active:scale-95 transition-transform cursor-pointer"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>Sign in with GitHub</span>
            </button>

            <button
              onClick={() => handleOAuthLogin('google')}
              className="px-5 py-3 bg-white dark:bg-[#1c1b18] hover:bg-[#f5f0e6] dark:hover:bg-[#262420] text-[#1c1917] dark:text-white border border-[#e7e2d6] dark:border-[#33302a] text-xs font-bold rounded-2xl flex items-center gap-2.5 shadow-2xs active:scale-95 transition-transform cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z" />
                <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.1s.7 5.4 1.9 7.8l3.7-2.9z" />
                <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            <button
              onClick={handleLaunchApp}
              className="px-5 py-3 bg-[#ccee22] hover:bg-[#b8dd11] text-[#1c1917] text-xs font-bold rounded-2xl flex items-center gap-2 shadow-xs active:scale-95 transition-transform cursor-pointer"
            >
              <span>Launch Workspace</span>
              <span>→</span>
            </button>
          </div>
        </div>

        {/* Live Workspace Preview Showcase */}
        <div className="relative rounded-3xl border border-[#e7e2d6] dark:border-[#33302a] bg-white dark:bg-[#1c1b18] p-4 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-[#f5f0e6] dark:border-[#262420] text-xs text-[#78716c] px-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#ef4444]" />
              <span className="w-3 h-3 rounded-full bg-[#f59e0b]" />
              <span className="w-3 h-3 rounded-full bg-[#10b981]" />
              <span className="ml-2 font-mono text-[11px] text-[#a8a29e]">forgetrack://core-workspace/dashboard</span>
            </div>
            <div className="text-[11px] font-bold text-[#aacc11] dark:text-[#d4f033] flex items-center gap-1">
              <SparklesIcon className="w-3.5 h-3.5" />
              <span>AI Intelligence Engine Active</span>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-[#fbf9f5] dark:bg-[#121110] rounded-2xl border border-[#e7e2d6] dark:border-[#33302a] space-y-2">
              <span className="text-[10px] font-bold uppercase text-[#78716c]">Atomic Integrity</span>
              <div className="text-xl font-black">Zero Sequence Gaps</div>
              <p className="text-xs text-[#78716c]">Row-level locking guarantees monotonic issue numbers during high-concurrency bursts.</p>
            </div>

            <div className="p-5 bg-[#fbf9f5] dark:bg-[#121110] rounded-2xl border border-[#e7e2d6] dark:border-[#33302a] space-y-2">
              <span className="text-[10px] font-bold uppercase text-[#78716c]">AI Assistant</span>
              <div className="text-xl font-black">Duplicate Detection</div>
              <p className="text-xs text-[#78716c]">Reciprocal Rank Fusion (RRF) vectors score semantic similarity in real time.</p>
            </div>

            <div className="p-5 bg-[#fbf9f5] dark:bg-[#121110] rounded-2xl border border-[#e7e2d6] dark:border-[#33302a] space-y-2">
              <span className="text-[10px] font-bold uppercase text-[#78716c]">Release Health</span>
              <div className="text-xl font-black">CI Blocker Shield</div>
              <p className="text-xs text-[#78716c]">Automated blockers gate releases and sync commits with GitHub/GitLab webhooks.</p>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <div className="p-6 bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-3xl space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#ccee22]/30 flex items-center justify-center text-lg">
              ⌨️
            </div>
            <h3 className="text-base font-bold text-[#1c1917] dark:text-white">Keyboard-First Velocity</h3>
            <p className="text-xs text-[#78716c] leading-relaxed">
              Global command palette (<kbd className="font-mono bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded">⌘K</kbd>), instant issue creation (<kbd className="font-mono bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded">C</kbd>), and sub-second filtering.
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-3xl space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#8b5cf6]/20 flex items-center justify-center text-lg">
              ✨
            </div>
            <h3 className="text-base font-bold text-[#1c1917] dark:text-white">AI Quality & Triage</h3>
            <p className="text-xs text-[#78716c] leading-relaxed">
              Live quality score auditing, automatic component and severity routing, and executive thread summarization.
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-3xl space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#ff7a38]/20 flex items-center justify-center text-lg">
              🛡️
            </div>
            <h3 className="text-base font-bold text-[#1c1917] dark:text-white">Hardened Enterprise Security</h3>
            <p className="text-xs text-[#78716c] leading-relaxed">
              Timing-safe HMAC signature verification, SSRF boundary validators, and parameterized query engines.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e7e2d6] dark:border-[#33302a] bg-white dark:bg-[#1c1b18] py-8 text-center text-xs text-[#78716c] space-y-2">
        <div className="flex items-center justify-center gap-2">
          <BugMascot state="happy" size={20} />
          <span className="font-bold text-[#1c1917] dark:text-white">ForgeTrack</span>
          <span>— High-Velocity Issue Tracking</span>
        </div>
        <p className="text-[11px] text-[#a8a29e]">
          Deployed on Vercel & Render • Open Source on GitHub
        </p>
      </footer>
    </div>
  );
};
