'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const sid = searchParams.get('sid');
    if (sid) {
      localStorage.setItem('forgetrack_token', sid);
      document.cookie = `sid=${sid}; path=/; max-age=604800; SameSite=Lax`;
    }
    // Redirect back to main dashboard
    router.replace('/');
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[#fbf9f5] dark:bg-[#121110] flex flex-col items-center justify-center space-y-4">
      <div className="w-10 h-10 border-4 border-[#ccee22] border-t-transparent rounded-full animate-spin" />
      <div className="text-sm font-bold text-[#1c1917] dark:text-white">Authenticating ForgeTrack session...</div>
      <div className="text-xs text-[#78716c]">Connecting with workspace identity provider...</div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fbf9f5] dark:bg-[#121110] flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-[#ccee22] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
