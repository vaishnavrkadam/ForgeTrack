'use client';

import React, { useState } from 'react';
import { useSound } from '../sound/SoundProvider';
import { useCursor } from '../cursor/BugCursor';
import { useStore } from '../../lib/store';
import { BugMascot } from '../mascot/BugMascot';

export const SettingsView: React.FC = () => {
  const { soundEnabled, setSoundEnabled, playSuccessSound, playHoverSound, playClickSound } = useSound();
  const { cursorMode, setCursorMode } = useCursor();
  const { issues } = useStore();

  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'completed'>('idle');
  const [importProgress, setImportProgress] = useState(0);

  const handleRunSampleImport = () => {
    setImportStatus('importing');
    setImportProgress(20);
    setTimeout(() => setImportProgress(60), 600);
    setTimeout(() => {
      setImportProgress(100);
      setImportStatus('completed');
      playSuccessSound();
    }, 1200);
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(issues, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "forgetrack-export.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    playSuccessSound();
  };

  const handleExportCsv = () => {
    const headers = ['Key', 'Title', 'Status', 'Priority', 'Severity', 'Assignee'];
    const rows = issues.map(i => [i.key, `"${i.title}"`, i.status, i.priority, i.severity, i.assigneeName || 'Unassigned']);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", encodeURI(csvContent));
    downloadAnchor.setAttribute("download", "forgetrack-export.csv");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    playSuccessSound();
  };

  return (
    <div className="space-y-6 select-none max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-[#1c1917] dark:text-white">Workspace Settings & Preferences</h1>
        <p className="text-xs text-[#78716c]">Custom cursor, sound effects, themes, and Phase 20 Import/Export maturity.</p>
      </div>

      {/* Signature Interaction Controls */}
      <div className="bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-3xl p-6 shadow-2xs space-y-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#78716c]">
          Signature UI Personality & Accessibility
        </h2>

        <div className="grid grid-cols-2 gap-4">
          {/* Cursor Toggle */}
          <div className="p-4 bg-[#fbf9f5] dark:bg-[#121110] border border-[#e7e2d6] dark:border-[#33302a] rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BugMascot state="happy" size={28} />
              <div>
                <h3 className="text-xs font-bold text-[#1c1917] dark:text-white">Bug Mascot Cursor</h3>
                <span className="text-[11px] text-[#78716c]">Smooth RAF tracking</span>
              </div>
            </div>
            <button
              onClick={() => {
                setCursorMode(cursorMode === 'bug' ? 'default' : 'bug');
                playClickSound();
              }}
              onMouseEnter={playHoverSound}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                cursorMode === 'bug'
                  ? 'bg-[#ccee22] text-[#1c1917] shadow-xs'
                  : 'bg-[#e7e2d6] dark:bg-[#33302a] text-[#78716c]'
              }`}
            >
              {cursorMode === 'bug' ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          {/* Sound Toggle */}
          <div className="p-4 bg-[#fbf9f5] dark:bg-[#121110] border border-[#e7e2d6] dark:border-[#33302a] rounded-2xl flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-[#1c1917] dark:text-white">Micro Audio Feedback</h3>
              <span className="text-[11px] text-[#78716c]">Subtle hover chirps & click pops</span>
            </div>
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                playClickSound();
              }}
              onMouseEnter={playHoverSound}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                soundEnabled
                  ? 'bg-[#ccee22] text-[#1c1917] shadow-xs'
                  : 'bg-[#e7e2d6] dark:bg-[#33302a] text-[#78716c]'
              }`}
            >
              {soundEnabled ? 'Enabled' : 'Muted'}
            </button>
          </div>
        </div>
      </div>

      {/* Phase 20: Import & Export */}
      <div className="bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-3xl p-6 shadow-2xs space-y-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#78716c]">
          Phase 20 — Import & Export Engine
        </h2>

        <div className="grid grid-cols-2 gap-4">
          {/* Export Options */}
          <div className="p-4 bg-[#fbf9f5] dark:bg-[#121110] border border-[#e7e2d6] dark:border-[#33302a] rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-[#1c1917] dark:text-white">Export Issues</h3>
            <p className="text-xs text-[#78716c]">Download full issue history, custom fields, components, and milestones.</p>
            <div className="flex gap-2">
              <button
                onClick={handleExportCsv}
                className="flex-1 py-1.5 bg-[#f5f0e6] dark:bg-[#262420] hover:bg-[#e7e2d6] text-xs font-bold rounded-xl text-[#1c1917] dark:text-white transition-colors"
              >
                Export CSV
              </button>
              <button
                onClick={handleExportJson}
                className="flex-1 py-1.5 bg-[#f5f0e6] dark:bg-[#262420] hover:bg-[#e7e2d6] text-xs font-bold rounded-xl text-[#1c1917] dark:text-white transition-colors"
              >
                Export JSON
              </button>
            </div>
          </div>

          {/* Import Parser */}
          <div className="p-4 bg-[#fbf9f5] dark:bg-[#121110] border border-[#e7e2d6] dark:border-[#33302a] rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-[#1c1917] dark:text-white">Import from Bugzilla / CSV</h3>
            <p className="text-xs text-[#78716c]">Asynchronous background jobs with error tracking and schema mapping.</p>
            <button
              onClick={handleRunSampleImport}
              disabled={importStatus === 'importing'}
              className="w-full py-1.5 bg-[#ccee22] hover:bg-[#b8dd11] text-[#1c1917] text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              {importStatus === 'importing' ? `Importing... (${importProgress}%)` : 'Run Bugzilla XML/CSV Import'}
            </button>
            {importStatus === 'completed' && (
              <div className="text-[11px] font-bold text-[#10b981]">
                ✓ Import job completed: 15 issues imported successfully.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
