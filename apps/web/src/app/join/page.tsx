'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useStore } from '../../lib/store';
import { useSound } from '../../components/sound/SoundProvider';
import { BugMascot } from '../../components/mascot/BugMascot';
import { api, normalizeApiUrl } from '../../lib/api';

function JoinContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const { currentUser, setCurrentOrg, setSelectedProject, reloadProjects, setViewMode } = useStore();
  const { playSuccessSound, playClickSound } = useSound();

  const [preview, setPreview] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const sid = searchParams.get('sid');
    if (sid) {
      localStorage.setItem('forgetrack_token', sid);
      document.cookie = `sid=${sid}; path=/; max-age=604800; SameSite=Lax`;
    }
  }, [searchParams]);

  useEffect(() => {
    if (!token) {
      setErrorMsg('No invitation token provided.');
      setIsLoading(false);
      return;
    }

    // Save pending token in case user needs to log in first
    try {
      localStorage.setItem('pending_join_token', token);
    } catch {
      // Ignored
    }

    const fetchPreview = async () => {
      try {
        const data = await api.get('/invitations/preview', { token });
        setPreview(data);
      } catch (err: any) {
        setErrorMsg(err.message || 'Invalid or expired invitation link.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreview();
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    playClickSound();
    setIsJoining(true);
    setErrorMsg(null);

    try {
      const acceptRes = await api.post<any>('/invitations/accept/raw', { token });
      try {
        localStorage.removeItem('pending_join_token');
      } catch {
        // Ignored
      }
      playSuccessSound();

      if (acceptRes && acceptRes.organization) {
        const joinedOrg = {
          id: acceptRes.organization.id,
          slug: acceptRes.organization.slug,
          name: acceptRes.organization.name,
          role: acceptRes.role || 'DEVELOPER',
        };
        setCurrentOrg(joinedOrg);
        const projs = await api.get<any[]>(`/organizations/${joinedOrg.id}/projects`);
        if (Array.isArray(projs) && projs.length > 0) {
          setSelectedProject(projs[0]);
        }
        await reloadProjects();
      }

      setViewMode('app');
      router.push('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to accept invitation.');
      setIsJoining(false);
    }
  };

  const handleOAuthLogin = () => {
    playClickSound();
    const apiUrl = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);
    const returnOrigin = typeof window !== 'undefined' ? `${window.location.origin}/join?token=${token}` : '';
    const stateParam = returnOrigin ? `?state=${encodeURIComponent(returnOrigin)}` : '';

    window.location.href = `${apiUrl}/auth/github${stateParam}`;
  };

  return (
    <div className="min-h-screen bg-[#fbf9f5] dark:bg-[#121110] flex items-center justify-center p-4 selection:bg-[#ccee22] selection:text-black">
      <div className="w-full max-w-md bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-3xl shadow-xl p-8 space-y-6 text-center">
        <div className="flex justify-center">
          <BugMascot state={errorMsg ? 'error' : 'happy'} size={48} />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <h1 className="text-base font-bold text-[#1c1917] dark:text-white animate-pulse">
              Verifying invitation link...
            </h1>
            <p className="text-xs text-[#78716c]">Connecting to ForgeTrack security service...</p>
          </div>
        ) : errorMsg ? (
          <div className="space-y-4">
            <h1 className="text-base font-bold text-[#ef4444]">Invitation Link Issue</h1>
            <p className="text-xs text-[#78716c]">{errorMsg}</p>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-[#f5f0e6] dark:bg-[#262420] text-[#1c1917] dark:text-white rounded-xl text-xs font-bold hover:bg-[#e7e2d6] transition-colors"
            >
              Return Home
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#aacc11] dark:text-[#d4f033]">
                Team Invitation
              </span>
              <h1 className="text-xl font-extrabold text-[#1c1917] dark:text-white">
                Join {preview?.organizationName || 'Workspace'}
              </h1>
              <p className="text-xs text-[#78716c]">
                <strong>{preview?.inviterName || 'A team member'}</strong> invited you to collaborate as a{' '}
                <span className="font-semibold text-[#1c1917] dark:text-white">{preview?.role || 'Developer'}</span>.
              </p>
            </div>

            {currentUser ? (
              <div className="space-y-3 pt-2">
                <div className="p-3 bg-[#f5f0e6] dark:bg-[#262420] rounded-xl text-xs text-[#78716c] flex items-center justify-between">
                  <span>Logged in as:</span>
                  <strong className="text-[#1c1917] dark:text-white">{currentUser.displayName} ({currentUser.email})</strong>
                </div>

                <button
                  onClick={handleAccept}
                  disabled={isJoining}
                  className="w-full py-3 bg-[#ccee22] hover:bg-[#b8dd11] active:scale-95 text-[#1c1917] font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isJoining ? 'Joining Team...' : 'Accept Invitation & Launch Workspace →'}
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-[#78716c]">
                  Sign in with GitHub to accept this workspace invite:
                </p>

                <button
                  onClick={handleOAuthLogin}
                  className="w-full py-3 bg-[#24292f] hover:bg-[#1b1f23] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  <span>Sign in with GitHub</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-xs font-bold text-[#78716c]">
        Loading invitation...
      </div>
    }>
      <JoinContent />
    </Suspense>
  );
}
