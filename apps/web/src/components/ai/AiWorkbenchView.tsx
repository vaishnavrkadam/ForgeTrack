'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '../../lib/store';
import { useSound } from '../sound/SoundProvider';
import { BugMascot } from '../mascot/BugMascot';
import { SparklesIcon, CheckIcon, CloseIcon } from '../ui/Icons';
import { api } from '../../lib/api';

export const AiWorkbenchView: React.FC = () => {
  const { selectedProject } = useStore();
  const { playSuccessSound } = useSound();

  const [activeTab, setActiveTab] = useState<'duplicate' | 'triage' | 'quality' | 'search'>('duplicate');
  const [testTitle, setTestTitle] = useState('');
  const [testDesc, setTestDesc] = useState('');
  const [semanticQuery, setSemanticQuery] = useState('');

  const [duplicateResult, setDuplicateResult] = useState<any[] | null>(null);
  const [projectDuplicates, setProjectDuplicates] = useState<any[] | null>(null);
  const [triageResult, setTriageResult] = useState<any | null>(null);
  const [qualityResult, setQualityResult] = useState<any | null>(null);
  const [searchResult, setSearchResult] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanningAll, setIsScanningAll] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<Array<{ id: string; type: string; title: string; confidence: number; status: 'PENDING' | 'ACCEPTED' | 'REJECTED' }>>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  useEffect(() => {
    if (!selectedProject) {
      setSuggestions([]);
      setProjectDuplicates(null);
      return;
    }

    const fetchSuggestions = async () => {
      setIsLoadingSuggestions(true);
      try {
        const data = await api.get(`/projects/${selectedProject.id}/ai/suggestions`);
        setSuggestions(Array.isArray(data) ? data : []);
      } catch {
        setSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    fetchSuggestions();
  }, [selectedProject]);

  const handleScanAllProjectIssues = async () => {
    if (!selectedProject) return;
    setIsScanningAll(true);
    setErrorMsg(null);
    try {
      const data = await api.get(`/projects/${selectedProject.id}/ai/duplicates/scan-all`);
      setProjectDuplicates(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to scan project duplicates.');
      setProjectDuplicates([]);
    } finally {
      setIsScanningAll(false);
    }
  };

  const handleRunDuplicateCheck = async () => {
    if (!testTitle.trim()) {
      setErrorMsg('Please enter a test defect title.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.post('/ai/duplicates', {
        projectId: selectedProject?.id,
        title: testTitle.trim(),
        description: testDesc.trim(),
      });
      setDuplicateResult(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Duplicate scan failed.');
      setDuplicateResult([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunTriage = async () => {
    if (!testTitle.trim()) {
      setErrorMsg('Please enter an issue title.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.post('/ai/triage', {
        title: testTitle.trim(),
        description: testDesc.trim(),
      });
      setTriageResult(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Triage classification failed.');
      setTriageResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunQualityAudit = async () => {
    if (!testTitle.trim() && !testDesc.trim()) {
      setErrorMsg('Please enter a title or description to audit.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.post('/ai/quality-check', {
        title: testTitle.trim(),
        description: testDesc.trim(),
      });
      setQualityResult(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Quality audit failed.');
      setQualityResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunSemanticSearch = async () => {
    if (!semanticQuery.trim()) {
      setErrorMsg('Please enter a search query.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.get('/search/semantic', { q: semanticQuery.trim() });
      setSearchResult(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Semantic search failed.');
      setSearchResult([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await api.post(`/ai/suggestions/${id}/accept`);
    } catch {
      // Ignored
    }
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: 'ACCEPTED' } : s));
    playSuccessSound();
  };

  const handleReject = async (id: string) => {
    try {
      await api.post(`/ai/suggestions/${id}/reject`);
    } catch {
      // Ignored
    }
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
            Vector embeddings, duplicate detection thresholding, automated issue triage, quality audits, and semantic search powered by Gemini.
          </p>
        </div>

        <BugMascot state="thinking" size={48} interactive className="animate-bug-pulse" />
      </div>

      {errorMsg && (
        <div className="p-3 bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 rounded-2xl text-xs font-semibold">
          {errorMsg}
        </div>
      )}

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
            onClick={() => {
              setActiveTab(t.id as any);
              setErrorMsg(null);
            }}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
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
            <div className="space-y-5">
              {/* Project-wide batch duplicate scanner */}
              <div className="p-4 bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#8b5cf6]">Project Duplicate Inspector</h4>
                  <p className="text-[11px] text-[#78716c]">
                    Automatically scans all issues in <strong className="text-[#1c1917] dark:text-white">{selectedProject?.name || 'current project'}</strong> to flag matching or identical defects.
                  </p>
                </div>
                <button
                  onClick={handleScanAllProjectIssues}
                  disabled={isScanningAll || !selectedProject}
                  className="px-4 py-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <SparklesIcon className="w-3.5 h-3.5" />
                  <span>{isScanningAll ? 'Inspecting...' : 'Scan All Project Issues'}</span>
                </button>
              </div>

              {projectDuplicates && projectDuplicates.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-[#78716c] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#ef4444] animate-ping" />
                    <span>Detected Duplicate Defects in Project ({projectDuplicates.length}):</span>
                  </div>
                  {projectDuplicates.map((dup, idx) => (
                    <div key={idx} className="p-4 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-2xl space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#ef4444]">{dup.primaryIssue.key}</span>
                          <span className="text-[#78716c]">⇄</span>
                          <span className="font-mono font-bold text-[#ef4444]">{dup.duplicateIssue.key}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-[#ef4444]/20 text-[#ef4444] font-bold text-[11px]">
                          {Math.round((dup.similarity || 0) * 100)}% Match
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 bg-white dark:bg-[#1c1b18] rounded-xl border border-[#e7e2d6] dark:border-[#33302a]">
                          <span className="text-[10px] text-[#78716c] font-bold block">{dup.primaryIssue.key}</span>
                          <span className="font-semibold text-[#1c1917] dark:text-white">{dup.primaryIssue.title}</span>
                        </div>
                        <div className="p-2.5 bg-white dark:bg-[#1c1b18] rounded-xl border border-[#e7e2d6] dark:border-[#33302a]">
                          <span className="text-[10px] text-[#78716c] font-bold block">{dup.duplicateIssue.key}</span>
                          <span className="font-semibold text-[#1c1917] dark:text-white">{dup.duplicateIssue.title}</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-[#78716c]">
                        {dup.reason || 'Identical or highly similar defect title.'}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {projectDuplicates && projectDuplicates.length === 0 && (
                <div className="p-3 bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 rounded-xl text-xs font-semibold text-center">
                  ✅ No duplicate defect pairs found among existing project issues.
                </div>
              )}

              {/* Single custom title tester */}
              <div className="pt-2 border-t border-[#e7e2d6] dark:border-[#33302a] space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#78716c]">
                    Test Single Defect Similarity
                  </h3>
                  <button
                    onClick={handleRunDuplicateCheck}
                    disabled={isLoading}
                    className="px-3 py-1.5 bg-[#f5f0e6] dark:bg-[#262420] hover:bg-[#e7e2d6] text-[#1c1917] dark:text-white text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? 'Scanning...' : 'Test Defect'}
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-[#78716c]">Defect Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Database connection timeout during peak traffic..."
                    value={testTitle}
                    onChange={e => setTestTitle(e.target.value)}
                    className="w-full bg-[#f5f0e6] dark:bg-[#262420] px-3 py-2 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-xs text-[#1c1917] dark:text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-[#78716c]">Description (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Error 504 gateway timeout when querying user profile..."
                    value={testDesc}
                    onChange={e => setTestDesc(e.target.value)}
                    className="w-full bg-[#f5f0e6] dark:bg-[#262420] px-3 py-2 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-xs text-[#1c1917] dark:text-white font-mono"
                  />
                </div>

                {duplicateResult && duplicateResult.length > 0 ? (
                  <div className="space-y-2 pt-2">
                    <div className="text-xs font-bold text-[#78716c]">Matching Potential Duplicates:</div>
                    {duplicateResult.map((dup, idx) => (
                      <div key={idx} className="p-4 bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 rounded-2xl space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-[#8b5cf6]">{dup.issueKey}</span>
                          <span className="font-bold text-[#10b981]">
                            {Math.round((dup.similarity || 0) * 100)}% Similarity
                          </span>
                        </div>
                        <div className="text-xs font-bold text-[#1c1917] dark:text-white">
                          {dup.title}
                        </div>
                        <p className="text-[11px] text-[#78716c]">
                          {dup.reason || 'Semantic and lexical similarity match.'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : duplicateResult && duplicateResult.length === 0 ? (
                  <div className="p-4 bg-[#fbf9f5] dark:bg-[#121110] border border-[#e7e2d6] dark:border-[#33302a] rounded-2xl text-center text-xs text-[#78716c]">
                    ✅ No duplicate defects matching this text.
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {activeTab === 'triage' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#78716c]">
                  Zero-Shot Triage Classifier
                </h3>
                <button
                  onClick={handleRunTriage}
                  disabled={isLoading}
                  className="px-3 py-1 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? 'Classifying...' : 'Run Triage'}
                </button>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-[#78716c]">Issue Title</label>
                <input
                  type="text"
                  placeholder="e.g. Critical payment gateway session expiration on checkout..."
                  value={testTitle}
                  onChange={e => setTestTitle(e.target.value)}
                  className="w-full bg-[#f5f0e6] dark:bg-[#262420] px-3 py-2 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-xs text-[#1c1917] dark:text-white font-medium"
                />
                <textarea
                  rows={2}
                  placeholder="e.g. Users are logged out when completing 3D secure verification step..."
                  value={testDesc}
                  onChange={e => setTestDesc(e.target.value)}
                  className="w-full bg-[#f5f0e6] dark:bg-[#262420] px-3 py-2 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-xs text-[#1c1917] dark:text-white font-mono"
                />
              </div>

              {triageResult && (
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="p-3 bg-[#f5f0e6] dark:bg-[#262420] rounded-xl border border-[#e7e2d6] dark:border-[#33302a]">
                    <span className="text-[10px] text-[#78716c] font-bold block uppercase">Predicted Type</span>
                    <span className="text-xs font-bold text-[#ff6b57]">{triageResult.type || 'BUG'}</span>
                  </div>
                  <div className="p-3 bg-[#f5f0e6] dark:bg-[#262420] rounded-xl border border-[#e7e2d6] dark:border-[#33302a]">
                    <span className="text-[10px] text-[#78716c] font-bold block uppercase">Priority & Severity</span>
                    <span className="text-xs font-bold text-[#1c1917] dark:text-white">{triageResult.priority || 'MEDIUM'} / {triageResult.severity || 'MAJOR'}</span>
                  </div>
                  <div className="p-3 bg-[#f5f0e6] dark:bg-[#262420] rounded-xl border border-[#e7e2d6] dark:border-[#33302a]">
                    <span className="text-[10px] text-[#78716c] font-bold block uppercase">Suggested Component</span>
                    <span className="text-xs font-bold text-[#3b82f6]">{triageResult.component || 'Core Engine'}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'quality' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#78716c]">
                  Issue Quality & Clarification Assistant
                </h3>
                <button
                  onClick={handleRunQualityAudit}
                  disabled={isLoading}
                  className="px-3 py-1 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? 'Auditing...' : 'Audit Quality'}
                </button>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-[#78716c]">Description Under Review</label>
                <textarea
                  rows={3}
                  placeholder="Paste issue reproduction steps and observed behaviors to audit completeness..."
                  value={testDesc}
                  onChange={e => setTestDesc(e.target.value)}
                  className="w-full bg-[#f5f0e6] dark:bg-[#262420] px-3 py-2 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-xs text-[#1c1917] dark:text-white font-mono"
                />
              </div>

              {qualityResult && (
                <div className="p-4 bg-[#fbf9f5] dark:bg-[#121110] border border-[#e7e2d6] dark:border-[#33302a] rounded-2xl space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#1c1917] dark:text-white">Quality Audit Score</span>
                    <span className="font-bold text-sm text-[#10b981]">{qualityResult.score || 0} / 100</span>
                  </div>
                  <ul className="text-xs space-y-1 text-[#78716c]">
                    {(qualityResult.findings || []).map((f: string, idx: number) => (
                      <li key={idx}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
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
                  placeholder="Search issues by concept or symptom (e.g. database timeout during checkout)..."
                  value={semanticQuery}
                  onChange={e => setSemanticQuery(e.target.value)}
                  className="flex-1 bg-[#f5f0e6] dark:bg-[#262420] px-3.5 py-2 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-xs text-[#1c1917] dark:text-white"
                />
                <button
                  onClick={handleRunSemanticSearch}
                  disabled={isLoading}
                  className="px-4 py-2 bg-[#8b5cf6] text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? 'Searching...' : 'Run Search'}
                </button>
              </div>

              {searchResult && searchResult.length > 0 ? (
                <div className="space-y-2">
                  {searchResult.map((iss, idx) => (
                    <div key={idx} className="p-3 bg-[#f5f0e6] dark:bg-[#262420] rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#aacc11] dark:text-[#d4f033]">{iss.key || iss.issueKey}</span>
                        <span className="text-[#1c1917] dark:text-white font-medium">{iss.title}</span>
                      </div>
                      <span className="text-[#8b5cf6] font-bold text-[11px]">Rank #{idx + 1}</span>
                    </div>
                  ))}
                </div>
              ) : searchResult && searchResult.length === 0 ? (
                <div className="p-4 bg-[#fbf9f5] dark:bg-[#121110] border border-[#e7e2d6] dark:border-[#33302a] rounded-2xl text-center text-xs text-[#78716c]">
                  No semantic matches found for &quot;{semanticQuery}&quot;.
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Right Col: Real AI Suggestions Review Card */}
        <div className="bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-3xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#78716c]">
              Pending AI Suggestions
            </h3>
            <span className="text-[10px] font-bold bg-[#8b5cf6]/20 text-[#8b5cf6] px-2 py-0.5 rounded-full">
              Non-destructive
            </span>
          </div>

          {isLoadingSuggestions ? (
            <div className="p-6 text-center text-xs text-[#78716c] animate-pulse">
              Loading project suggestions...
            </div>
          ) : suggestions.length === 0 ? (
            <div className="p-6 bg-[#fbf9f5] dark:bg-[#121110] border border-[#e7e2d6] dark:border-[#33302a] rounded-2xl text-center text-xs text-[#78716c] space-y-2">
              <BugMascot state="happy" size={32} className="mx-auto" />
              <p className="font-semibold text-[#1c1917] dark:text-white">All caught up!</p>
              <p className="text-[11px]">
                No pending AI suggestions for {selectedProject?.key || 'this project'}. As new issues are reported, automated duplicate and triage suggestions will appear here.
              </p>
            </div>
          ) : (
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
                        className="flex-1 py-1 bg-[#10b981] hover:bg-[#059669] text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <CheckIcon className="w-3 h-3" />
                        <span>Accept</span>
                      </button>
                      <button
                        onClick={() => handleReject(s.id)}
                        className="flex-1 py-1 bg-[#f5f0e6] dark:bg-[#262420] text-[#78716c] hover:text-[#1c1917] text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
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
          )}
        </div>
      </div>
    </div>
  );
};
