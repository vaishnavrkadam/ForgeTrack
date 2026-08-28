'use client';

import React, { useState } from 'react';
import { useStore } from '../../lib/store';
import { useSound } from '../sound/SoundProvider';
import { BugMascot } from '../mascot/BugMascot';
import { SparklesIcon, CheckIcon, CloseIcon } from '../ui/Icons';

export const AiWorkbenchView: React.FC = () => {
  const { issues } = useStore();
  const { playSuccessSound } = useSound();

  const [activeTab, setActiveTab] = useState<'duplicate' | 'triage' | 'quality' | 'search'>('duplicate');
  const [testTitle, setTestTitle] = useState('Payment authorization failure on timeout');
  const [testDesc, setTestDesc] = useState('Checkout returns 504 gateway timeout when card authorization exceeds 30s. Reproduction: step 1, load checkout; step 2, click pay.');
  const [semanticQuery, setSemanticQuery] = useState('deadlock on sequence counters');

  const [suggestions, setSuggestions] = useState<Array<{ id: string; type: string; title: string; confidence: number; status: 'PENDING' | 'ACCEPTED' | 'REJECTED' }>>([
    { id: 's1', type: 'DUPLICATE', title: 'FORGE-101 is 88% similar to FORGE-42', confidence: 0.88, status: 'PENDING' },
    { id: 's2', type: 'TRIAGE', title: 'Suggested Priority: URGENT, Component: Database for FORGE-101', confidence: 0.92, status: 'PENDING' },
    { id: 's3', type: 'QUALITY', title: 'Issue WEB-42 scored 90/100 completeness with reproduction steps', confidence: 0.90, status: 'ACCEPTED' },
  ]);

  const handleAccept = (id: string) => {
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: 'ACCEPTED' } : s));
    playSuccessSound();
  };

  const handleReject = (id: string) => {
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: 'REJECTED' } : s));
  };

  return (
    <div className="space-y-6 select-none">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-[#8b5cf6]/15 via-white to-[#ccee22]/15 dark:from-[#2e1065]/40 dark:via-[#1c1b18] dark:to-[#121110] border border-[#8b5cf6]/30 rounded-3xl flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8b5cf6]">
            <SparklesIcon className="w-4 h-4" />
            <span>AI Intelligence Pipeline</span>
          </div>
          <h1 className="text-xl font-extrabold text-[#1c1917] dark:text-white">
            ForgeTrack AI Studio & Workbench
          </h1>
          <p className="text-xs text-[#78716c] max-w-lg">
            Vector embeddings, duplicate detection thresholding, automated issue triage, quality audits, and semantic search.
          </p>
        </div>

        <BugMascot state="thinking" size={48} interactive className="animate-bug-pulse" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#e7e2d6] dark:border-[#33302a] pb-3 text-xs font-bold">
        {[
          { id: 'duplicate', label: 'Duplicate Detection' },
          { id: 'triage', label: 'Triage Classification' },
          { id: 'quality', label: 'Quality Audit' },
          { id: 'search', label: 'Semantic Search' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === t.id
                ? 'bg-[#8b5cf6] text-white shadow-xs'
                : 'bg-white dark:bg-[#1c1b18] text-[#78716c] hover:text-[#1c1917] border border-[#e7e2d6] dark:border-[#33302a]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left 2 Cols: Interactive Playground */}
        <div className="col-span-2 bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-3xl p-6 shadow-2xs space-y-4">
          {activeTab === 'duplicate' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#78716c]">
                Cosine Vector Similarity Duplicate Scanner (Threshold: 0.70)
              </h3>
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-[#78716c]">Test Defect Title</label>
                <input
                  type="text"
                  value={testTitle}
                  onChange={e => setTestTitle(e.target.value)}
                  className="w-full bg-[#f5f0e6] dark:bg-[#262420] px-3 py-2 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-xs text-[#1c1917] dark:text-white"
                />
              </div>

              {/* Match Output */}
              <div className="p-4 bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 rounded-2xl space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-[#8b5cf6]">Top Ranked Match</span>
                  <span className="font-bold text-[#10b981]">86.4% Similarity</span>
                </div>
                <div className="text-xs font-bold text-[#1c1917] dark:text-white">
                  FORGE-101: Atomic issue counter lock during high concurrency
                </div>
                <p className="text-[11px] text-[#78716c]">
                  High vector cosine similarity between authorization timeout and transactional concurrency lock description embeddings.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'triage' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#78716c]">
                Zero-Shot Triage Classifier
              </h3>
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-[#78716c]">Issue Title & Description</label>
                <input
                  type="text"
                  value={testTitle}
                  onChange={e => setTestTitle(e.target.value)}
                  className="w-full bg-[#f5f0e6] dark:bg-[#262420] px-3 py-2 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-xs text-[#1c1917] dark:text-white font-medium"
                />
                <textarea
                  rows={2}
                  value={testDesc}
                  onChange={e => setTestDesc(e.target.value)}
                  className="w-full bg-[#f5f0e6] dark:bg-[#262420] px-3 py-2 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-xs text-[#1c1917] dark:text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-[#f5f0e6] dark:bg-[#262420] rounded-xl border border-[#e7e2d6] dark:border-[#33302a]">
                  <span className="text-[10px] text-[#78716c] font-bold block uppercase">Predicted Type</span>
                  <span className="text-xs font-bold text-[#ff6b57]">BUG (94% confidence)</span>
                </div>
                <div className="p-3 bg-[#f5f0e6] dark:bg-[#262420] rounded-xl border border-[#e7e2d6] dark:border-[#33302a]">
                  <span className="text-[10px] text-[#78716c] font-bold block uppercase">Priority & Severity</span>
                  <span className="text-xs font-bold text-[#1c1917] dark:text-white">URGENT / CRITICAL</span>
                </div>
                <div className="p-3 bg-[#f5f0e6] dark:bg-[#262420] rounded-xl border border-[#e7e2d6] dark:border-[#33302a]">
                  <span className="text-[10px] text-[#78716c] font-bold block uppercase">Suggested Component</span>
                  <span className="text-xs font-bold text-[#3b82f6]">Database / Auth</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'quality' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#78716c]">
                Issue Quality & Clarification Assistant
              </h3>
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-[#78716c]">Description Under Review</label>
                <textarea
                  rows={2}
                  value={testDesc}
                  onChange={e => setTestDesc(e.target.value)}
                  className="w-full bg-[#f5f0e6] dark:bg-[#262420] px-3 py-2 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-xs text-[#1c1917] dark:text-white font-mono"
                />
              </div>

              <div className="p-4 bg-[#fbf9f5] dark:bg-[#121110] border border-[#e7e2d6] dark:border-[#33302a] rounded-2xl space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#1c1917] dark:text-white">Quality Audit Score</span>
                  <span className="font-bold text-sm text-[#10b981]">88 / 100</span>
                </div>
                <ul className="text-xs space-y-1 text-[#78716c]">
                  <li>✅ Step-by-step reproduction sequence detected</li>
                  <li>✅ Environment parameters specified</li>
                  <li>⚠️ Missing target device / OS details</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'search' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#78716c]">
                Permission-Aware Semantic & Hybrid Search
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={semanticQuery}
                  onChange={e => setSemanticQuery(e.target.value)}
                  className="flex-1 bg-[#f5f0e6] dark:bg-[#262420] px-3.5 py-2 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-xs text-[#1c1917] dark:text-white"
                />
                <button className="px-4 py-2 bg-[#8b5cf6] text-white text-xs font-bold rounded-xl">
                  Run RRF Search
                </button>
              </div>

              <div className="space-y-2">
                {issues.slice(0, 3).map((iss, idx) => (
                  <div key={iss.id} className="p-3 bg-[#f5f0e6] dark:bg-[#262420] rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#aacc11] dark:text-[#d4f033]">{iss.key}</span>
                      <span className="text-[#1c1917] dark:text-white font-medium">{iss.title}</span>
                    </div>
                    <span className="text-[#8b5cf6] font-bold text-[11px]">Rank #{idx + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Col: AI Suggestions Review Card */}
        <div className="bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-3xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#78716c]">
              Pending AI Suggestions
            </h3>
            <span className="text-[10px] font-bold bg-[#8b5cf6]/20 text-[#8b5cf6] px-2 py-0.5 rounded-full">
              Non-destructive
            </span>
          </div>

          <div className="space-y-3">
            {suggestions.map(s => (
              <div
                key={s.id}
                className="p-3 bg-[#fbf9f5] dark:bg-[#121110] border border-[#e7e2d6] dark:border-[#33302a] rounded-2xl text-xs space-y-2"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold px-2 py-0.2 bg-[#8b5cf6]/20 text-[#8b5cf6] rounded-full">
                    {s.type}
                  </span>
                  <span className="text-[10px] text-[#78716c] font-semibold">
                    {Math.round(s.confidence * 100)}% conf
                  </span>
                </div>

                <p className="text-xs text-[#1c1917] dark:text-white font-medium leading-tight">
                  {s.title}
                </p>

                {s.status === 'PENDING' ? (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleAccept(s.id)}
                      className="flex-1 py-1 bg-[#10b981] hover:bg-[#059669] text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition-colors"
                    >
                      <CheckIcon className="w-3 h-3" />
                      <span>Accept</span>
                    </button>
                    <button
                      onClick={() => handleReject(s.id)}
                      className="flex-1 py-1 bg-[#f5f0e6] dark:bg-[#262420] text-[#78716c] hover:text-[#1c1917] text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors"
                    >
                      <CloseIcon className="w-3 h-3" />
                      <span>Dismiss</span>
                    </button>
                  </div>
                ) : (
                  <div className={`text-[11px] font-bold ${s.status === 'ACCEPTED' ? 'text-[#10b981]' : 'text-[#78716c]'}`}>
                    Status: {s.status}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
