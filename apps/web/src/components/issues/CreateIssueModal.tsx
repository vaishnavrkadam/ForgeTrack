'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../lib/store';
import { useSound } from '../sound/SoundProvider';
import { BugMascot } from '../mascot/BugMascot';
import { SparklesIcon, CloseIcon } from '../ui/Icons';
import { fetchProjectMembers } from '../../lib/api/issues';
import { ProjectMemberData } from '../../lib/types';

export const CreateIssueModal: React.FC = () => {
  const {
    isCreateModalOpen,
    setIsCreateModalOpen,
    createIssue,
    selectedProject,
    issues,
    currentUser,
  } = useStore();

  const { playSuccessSound, playHoverSound } = useSound();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('BUG');
  const [priority, setPriority] = useState('HIGH');
  const [severity, setSeverity] = useState('MAJOR');
  const [component, setComponent] = useState('Core Engine');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [members, setMembers] = useState<ProjectMemberData[]>([]);
  const [previewTab, setPreviewTab] = useState<'write' | 'preview'>('write');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load project members
  useEffect(() => {
    if (selectedProject && isCreateModalOpen) {
      fetchProjectMembers(selectedProject.id)
        .then(list => {
          setMembers(list);
          if (list.length > 0 && !assigneeId) {
            setAssigneeId(list[0].userId);
          }
        })
        .catch(() => {
          // Fallback if no members found yet
          setMembers([]);
        });
    }
  }, [selectedProject, isCreateModalOpen, assigneeId]);

  // Real-time AI Duplicate Warning computation
  const duplicateCandidate = useMemo(() => {
    if (!title || title.trim().length < 5) return null;
    const lower = title.toLowerCase();
    return issues.find(i => {
      const matchWords = lower.split(' ').filter(w => w.length > 3);
      const otherWords = i.title.toLowerCase();
      const hits = matchWords.filter(w => otherWords.includes(w));
      return hits.length >= 2;
    });
  }, [title, issues]);

  // Real-time Quality Score computation
  const qualityScore = useMemo(() => {
    let score = 100;
    if (title.length < 10) score -= 25;
    if (description.length < 30) score -= 30;
    if (!description.toLowerCase().includes('step') && !description.toLowerCase().includes('reproduce')) score -= 20;
    return Math.max(20, Math.min(100, score));
  }, [title, description]);

  if (!isCreateModalOpen || !selectedProject) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await createIssue({
        title: title.trim(),
        description: description.trim(),
        type,
        priority,
        severity,
        component,
        assigneeId: assigneeId || undefined,
        labels: ['new-triage'],
      });

      playSuccessSound();
      setIsCreateModalOpen(false);
      setTitle('');
      setDescription('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create issue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-3xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#e7e2d6] dark:border-[#33302a] flex items-center justify-between bg-[#fbf9f5] dark:bg-[#121110]">
          <div className="flex items-center gap-3">
            <BugMascot state={qualityScore > 80 ? 'happy' : 'thinking'} size={28} />
            <div>
              <h2 className="text-base font-bold text-[#1c1917] dark:text-white flex items-center gap-2">
                Create Issue in <span className="text-[#aacc11] dark:text-[#d4f033]">{selectedProject.key}</span>
              </h2>
              <p className="text-xs text-[#78716c]">Atomic sequence allocation enabled</p>
            </div>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(false)}
            className="text-[#78716c] hover:text-[#1c1917] dark:hover:text-white p-1 rounded-lg"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 rounded-xl text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Issue Type & Priority / Severity */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#78716c] uppercase mb-1">Issue Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="w-full bg-[#f5f0e6] dark:bg-[#262420] text-xs font-semibold px-3 py-2 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-[#1c1917] dark:text-white focus:outline-none"
              >
                <option value="BUG">🐛 Bug Defect</option>
                <option value="FEATURE">✨ Feature Request</option>
                <option value="TASK">📋 Engineering Task</option>
                <option value="IMPROVEMENT">⚡ Improvement</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#78716c] uppercase mb-1">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="w-full bg-[#f5f0e6] dark:bg-[#262420] text-xs font-semibold px-3 py-2 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-[#1c1917] dark:text-white focus:outline-none"
              >
                <option value="URGENT">🔴 Urgent</option>
                <option value="HIGH">🟠 High</option>
                <option value="MEDIUM">🟡 Medium</option>
                <option value="LOW">🟢 Low</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#78716c] uppercase mb-1">Severity</label>
              <select
                value={severity}
                onChange={e => setSeverity(e.target.value)}
                className="w-full bg-[#f5f0e6] dark:bg-[#262420] text-xs font-semibold px-3 py-2 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-[#1c1917] dark:text-white focus:outline-none"
              >
                <option value="BLOCKER">💥 Blocker</option>
                <option value="CRITICAL">🔥 Critical</option>
                <option value="MAJOR">⚠️ Major</option>
                <option value="MINOR">🔹 Minor</option>
                <option value="TRIVIAL">🌱 Trivial</option>
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-bold text-[#78716c] uppercase">Summary / Title</label>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${qualityScore >= 80 ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#f59e0b]/20 text-[#f59e0b]'}`}>
                Quality Score: {qualityScore}/100
              </span>
            </div>
            <input
              type="text"
              required
              placeholder="e.g. Auth session invalidates prematurely on load balancer switch"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-[#f5f0e6] dark:bg-[#262420] px-3.5 py-2.5 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-sm text-[#1c1917] dark:text-white focus:outline-none font-medium"
            />
          </div>

          {/* AI Duplicate Detection Warning Banner */}
          {duplicateCandidate && (
            <div className="p-3 bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 rounded-2xl flex items-start gap-3 animate-in fade-in duration-200">
              <SparklesIcon className="w-5 h-5 text-[#8b5cf6] shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-bold text-[#8b5cf6]">AI Duplicate Warning: Similar issue detected</div>
                <div className="text-[#78716c] mt-0.5">
                  <span className="font-mono font-bold text-[#1c1917] dark:text-white">{duplicateCandidate.key}:</span> {duplicateCandidate.title} ({duplicateCandidate.status})
                </div>
              </div>
            </div>
          )}

          {/* Description with Write/Preview toggle */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-[#78716c] uppercase">Description & Steps to Reproduce</label>
              <div className="flex gap-1 text-[11px] font-semibold bg-[#f5f0e6] dark:bg-[#262420] p-0.5 rounded-lg border border-[#e7e2d6] dark:border-[#33302a]">
                <button
                  type="button"
                  onClick={() => setPreviewTab('write')}
                  className={`px-2 py-0.5 rounded-md ${previewTab === 'write' ? 'bg-white dark:bg-[#1c1b18] shadow-xs text-[#1c1917] dark:text-white' : 'text-[#78716c]'}`}
                >
                  Write
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('preview')}
                  className={`px-2 py-0.5 rounded-md ${previewTab === 'preview' ? 'bg-white dark:bg-[#1c1b18] shadow-xs text-[#1c1917] dark:text-white' : 'text-[#78716c]'}`}
                >
                  Preview
                </button>
              </div>
            </div>

            {previewTab === 'write' ? (
              <textarea
                rows={4}
                placeholder="Include environment, exact step-by-step actions, expected result, and actual behavior..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-[#f5f0e6] dark:bg-[#262420] p-3 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-xs text-[#1c1917] dark:text-white focus:outline-none font-mono"
              />
            ) : (
              <div className="p-3 bg-[#f5f0e6] dark:bg-[#262420] rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-xs text-[#1c1917] dark:text-white min-h-[96px] whitespace-pre-wrap">
                {description || <span className="text-[#a8a29e] italic">Nothing to preview yet.</span>}
              </div>
            )}
          </div>

          {/* Component & Assignee */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#78716c] uppercase mb-1">Component</label>
              <select
                value={component}
                onChange={e => setComponent(e.target.value)}
                className="w-full bg-[#f5f0e6] dark:bg-[#262420] text-xs font-semibold px-3 py-2 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-[#1c1917] dark:text-white focus:outline-none"
              >
                <option value="Core Engine">Core Engine</option>
                <option value="Database">Database & Transactions</option>
                <option value="UI/UX">UI & Interactions</option>
                <option value="Integrations">Git & Webhooks</option>
                <option value="Security">Security & Auth</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#78716c] uppercase mb-1">Assignee</label>
              <select
                value={assigneeId}
                onChange={e => setAssigneeId(e.target.value)}
                className="w-full bg-[#f5f0e6] dark:bg-[#262420] text-xs font-semibold px-3 py-2 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-[#1c1917] dark:text-white focus:outline-none"
              >
                <option value="">Unassigned</option>
                {members.length > 0 ? (
                  members.map(m => (
                    <option key={m.userId} value={m.userId}>
                      {m.displayName} ({m.role})
                    </option>
                  ))
                ) : (
                  currentUser && (
                    <option value={currentUser.id}>
                      {currentUser.displayName} (You)
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-[#e7e2d6] dark:border-[#33302a] flex items-center justify-between">
            <div className="text-[11px] text-[#78716c]">
              Press <kbd className="font-mono bg-[#f5f0e6] dark:bg-[#262420] px-1 py-0.5 rounded">Enter</kbd> to submit
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#78716c] hover:bg-[#f5f0e6] dark:hover:bg-[#262420] rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                onMouseEnter={playHoverSound}
                className="px-5 py-2 text-xs font-bold bg-[#ccee22] hover:bg-[#b8dd11] active:scale-95 text-[#1c1917] rounded-xl shadow-xs transition-transform disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Issue'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
