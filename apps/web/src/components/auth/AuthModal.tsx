'use client';

import React, { useState } from 'react';
import { useStore } from '../../lib/store';
import { useSound } from '../sound/SoundProvider';
import { BugMascot } from '../mascot/BugMascot';

import { normalizeApiUrl } from '../../lib/api';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setIsAuthModalOpen } = useStore();
  const { playClickSound } = useSound();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleGitHubLogin = () => {
    playClickSound();
    setIsLoading(true);
    setErrorMsg(null);

    const apiUrl = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);
    const returnOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const stateParam = returnOrigin ? `?state=${encodeURIComponent(returnOrigin)}` : '';

    window.location.href = `${apiUrl}/auth/github${stateParam}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-md bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-3xl p-7 shadow-2xl space-y-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={() => setIsAuthModalOpen(false)}
          className="absolute top-5 right-5 text-[#a8a29e] hover:text-[#1c1917] dark:hover:text-white p-1 rounded-lg text-lg leading-none cursor-pointer"
        >
          ✕
        </button>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-2 bg-[#f5f0e6] dark:bg-[#262420] rounded-2xl mb-1">
            <BugMascot state="happy" size={36} className="animate-bug-bounce" />
          </div>
          <h2 className="text-xl font-black text-[#1c1917] dark:text-white tracking-tight">
            Sign in to ForgeTrack
          </h2>
          <p className="text-xs text-[#78716c]">
            Access your engineering issues, workflows, and release intelligence.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 rounded-xl text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* GitHub OAuth Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleGitHubLogin}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-[#24292f] hover:bg-[#1b1f23] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            )}
            <span>Continue with GitHub</span>
          </button>
        </div>

        <div className="text-center pt-1">
          <p className="text-[11px] text-[#a8a29e]">
            Secure single sign-on powered by GitHub OAuth
          </p>
        </div>
      </div>
    </div>
  );
};
