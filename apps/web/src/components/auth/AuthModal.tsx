'use client';

import React, { useState } from 'react';
import { useStore } from '../../lib/store';
import { useSound } from '../sound/SoundProvider';
import { BugMascot } from '../mascot/BugMascot';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, loginDev, loginEmail } = useStore();
  const { playClickSound, playSuccessSound } = useSound();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleOAuthLogin = (provider: 'github' | 'google') => {
    playClickSound();
    setIsLoading(provider);
    setErrorMsg(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

    // If client ID is not present, we use dev-login instantly; otherwise redirect to real OAuth endpoint
    if (provider === 'github') {
      window.location.href = `${apiUrl}/auth/github`;
    } else {
      window.location.href = `${apiUrl}/auth/google`;
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    setIsLoading('email');
    setErrorMsg(null);

    try {
      await loginEmail(email, password, mode === 'signup', name);
      playSuccessSound();
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed.');
    } finally {
      setIsLoading(null);
    }
  };

  const handleQuickDevLogin = async (provider: 'github' | 'google') => {
    playClickSound();
    setIsLoading(provider);
    setErrorMsg(null);

    try {
      await loginDev(provider, name || (provider === 'github' ? 'GitHub Engineer' : 'Google Lead'), email);
      playSuccessSound();
    } catch (err: any) {
      setErrorMsg(err.message || 'Dev login failed.');
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-md bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-3xl p-7 shadow-2xl space-y-5 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={() => setIsAuthModalOpen(false)}
          className="absolute top-5 right-5 text-[#a8a29e] hover:text-[#1c1917] dark:hover:text-white p-1 rounded-lg text-lg leading-none"
        >
          ✕
        </button>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-2 bg-[#f5f0e6] dark:bg-[#262420] rounded-2xl mb-1">
            <BugMascot state="happy" size={36} className="animate-bug-bounce" />
          </div>
          <h2 className="text-xl font-black text-[#1c1917] dark:text-white tracking-tight">
            {mode === 'signin' ? 'Sign in to ForgeTrack' : 'Create your ForgeTrack Account'}
          </h2>
          <p className="text-xs text-[#78716c]">
            {mode === 'signin'
              ? 'Access your engineering issues, workflows, and release intelligence.'
              : 'Start tracking high-velocity software engineering defects today.'}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 rounded-xl text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* OAuth Buttons */}
        <div className="space-y-2.5">
          {/* GitHub OAuth Button */}
          <button
            type="button"
            onClick={() => handleOAuthLogin('github')}
            disabled={!!isLoading}
            className="w-full py-2.5 px-4 bg-[#24292f] hover:bg-[#1b1f23] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isLoading === 'github' ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            )}
            <span>Continue with GitHub</span>
          </button>

          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={() => handleOAuthLogin('google')}
            disabled={!!isLoading}
            className="w-full py-2.5 px-4 bg-white dark:bg-[#262420] hover:bg-[#f8f5ee] dark:hover:bg-[#33302a] text-[#1c1917] dark:text-white border border-[#e7e2d6] dark:border-[#33302a] text-xs font-bold rounded-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {isLoading === 'google' ? (
              <span className="inline-block w-4 h-4 border-2 border-[#1c1917] dark:border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z" />
                <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.1s.7 5.4 1.9 7.8l3.7-2.9z" />
                <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z" />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[#e7e2d6] dark:bg-[#33302a]" />
          <span className="text-[10px] uppercase font-bold text-[#a8a29e] tracking-wider">or with email</span>
          <div className="flex-1 h-px bg-[#e7e2d6] dark:bg-[#33302a]" />
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-3">
          {mode === 'signup' && (
            <div>
              <label className="block text-[11px] font-bold text-[#78716c] uppercase mb-1">Your Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Vaishnav Kadam"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#f5f0e6] dark:bg-[#262420] border border-[#e7e2d6] dark:border-[#33302a] rounded-xl text-xs text-[#1c1917] dark:text-white focus:outline-none focus:border-[#aacc11]"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-[#78716c] uppercase mb-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="engineer@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#f5f0e6] dark:bg-[#262420] border border-[#e7e2d6] dark:border-[#33302a] rounded-xl text-xs text-[#1c1917] dark:text-white focus:outline-none focus:border-[#aacc11]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#78716c] uppercase mb-1">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#f5f0e6] dark:bg-[#262420] border border-[#e7e2d6] dark:border-[#33302a] rounded-xl text-xs text-[#1c1917] dark:text-white focus:outline-none focus:border-[#aacc11]"
            />
          </div>

          <button
            type="submit"
            disabled={!!isLoading}
            className="w-full py-2.5 bg-[#ccee22] hover:bg-[#b8dd11] active:scale-[0.98] text-[#1c1917] text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer mt-2 disabled:opacity-50"
          >
            {isLoading === 'email' ? 'Authenticating...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Quick Dev Login for local preview */}
        <div className="pt-2 border-t border-[#e7e2d6] dark:border-[#33302a] flex items-center justify-between text-[11px]">
          <span className="text-[#a8a29e]">Quick Dev Auth:</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleQuickDevLogin('github')}
              className="text-[#3b82f6] hover:underline font-semibold"
            >
              Dev GitHub
            </button>
            <span className="text-[#a8a29e]">•</span>
            <button
              type="button"
              onClick={() => handleQuickDevLogin('google')}
              className="text-[#3b82f6] hover:underline font-semibold"
            >
              Dev Google
            </button>
          </div>
        </div>

        {/* Footer switch mode */}
        <div className="text-center pt-1">
          <button
            type="button"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="text-xs text-[#78716c] hover:text-[#1c1917] dark:hover:text-white transition-colors"
          >
            {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};
