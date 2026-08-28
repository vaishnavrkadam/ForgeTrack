import './globals.css';
import React from 'react';
import { StoreProvider } from '../lib/store';
import { SoundProvider } from '../components/sound/SoundProvider';
import { CursorProvider } from '../components/cursor/BugCursor';

export const metadata = {
  title: 'ForgeTrack — Engineering Issue Tracking with Personality',
  description: 'A modern, powerful issue tracker inspired by Bugzilla, wrapped in a friendly visual world.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased selection:bg-[#ccee22] selection:text-black">
        <StoreProvider>
          <SoundProvider>
            <CursorProvider>
              {children}
            </CursorProvider>
          </SoundProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
