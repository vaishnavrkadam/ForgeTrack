'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '../../lib/store';
import { useSound } from '../sound/SoundProvider';
import { BugMascot } from '../mascot/BugMascot';
import { CloseIcon, SparklesIcon, CheckIcon } from '../ui/Icons';
import { fetchIssueComments, addIssueComment } from '../../lib/api/issues';
import { CommentData } from '../../lib/types';

export const IssueDetailView: React.FC = () => {
  const { selectedIssue, setSelectedIssue, updateIssueStatus, ciRuns, currentUser } = useStore();
  const { playSuccessSound, playHoverSound } = useSound();
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<CommentData[]>([]);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Load real comments from API
  useEffect(() => {
    if (selectedIssue) {
      fetchIssueComments(selectedIssue.id)
        .then(list => setComments(list))
        .catch(() => setComments([]));
    }
  }, [selectedIssue]);

  if (!selectedIssue) return null;

  const statuses = [
    { name: 'OPEN', category: 'TODO' as const, label: 'Open' },
    { name: 'IN_PROGRESS', category: 'IN_PROGRESS' as const, label: 'In Progress' },
    { name: 'RESOLVED', category: 'DONE' as const, label: 'Resolved' },
    { name: 'CLOSED', category: 'DONE' as const, label: 'Closed' },
  ];

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsSubmittingComment(true);
    try {
      const added = await addIssueComment(selectedIssue.id, commentText.trim());
      setComments(prev => [...prev, added]);
      setCommentText('');
      playSuccessSound();
    } catch {
      // Local fallback
      setComments(prev => [
        ...prev,
        {
          id: `c-${Date.now()}`,
          user: currentUser?.displayName || 'You',
          text: commentText.trim(),
          time: 'Just now',
        },
      ]);
      setCommentText('');
      playSuccessSound();
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const getMascotState = () => {
    if (selectedIssue.status === 'RESOLVED' || selectedIssue.status === 'CLOSED') return 'happy';
    if (selectedIssue.priority === 'URGENT') return 'error';
    if (selectedIssue.status === 'IN_PROGRESS' || selectedIssue.status === 'IN PROGRESS') return 'working';
    return 'idle';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-4xl bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-[#e7e2d6] dark:border-[#33302a] flex items-center justify-between bg-[#fbf9f5] dark:bg-[#121110]">
          <div className="flex items-center gap-3">
            <BugMascot state={getMascotState()} size={32} interactive className="animate-bug-wiggle" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-[#e7e2d6] dark:bg-[#33302a] text-[#1c1917] dark:text-white">
                  {selectedIssue.key}
                </span>
                <span className="text-xs text-[#78716c]">/ {selectedIssue.component || 'General'}</span>
              </div>
              <h2 className="text-base font-bold text-[#1c1917] dark:text-white mt-0.5">
                {selectedIssue.title}
              </h2>
            </div>
          </div>

          <button
            onClick={() => setSelectedIssue(null)}
            className="text-[#78716c] hover:text-[#1c1917] dark:hover:text-white p-1 rounded-lg"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Status Transition Ribbon */}
        <div className="px-6 py-2.5 bg-[#f5f0e6] dark:bg-[#262420] border-b border-[#e7e2d6] dark:border-[#33302a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#78716c] uppercase mr-2">Workflow Status:</span>
            {statuses.map(st => {
              const isCurrent =
                selectedIssue.status === st.name ||
                (selectedIssue.status === 'IN PROGRESS' && st.name === 'IN_PROGRESS');

              return (
                <button
                  key={st.name}
                  onClick={() => {
                    updateIssueStatus(selectedIssue.id, st.name, st.category);
                    playSuccessSound();
                  }}
                  onMouseEnter={playHoverSound}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                    isCurrent
                      ? 'bg-[#ccee22] text-[#1c1917] shadow-xs scale-105'
                      : 'bg-white dark:bg-[#1c1b18] text-[#78716c] hover:text-[#1c1917] border border-[#e7e2d6] dark:border-[#33302a]'
                  }`}
                >
                  {isCurrent && <CheckIcon className="w-3 h-3 text-[#1c1917]" />}
                  <span>{st.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded-full font-bold bg-[#ff6b57]/20 text-[#ff6b57]">
              {selectedIssue.priority}
            </span>
            <span className="px-2 py-0.5 rounded-full font-bold bg-[#8b5cf6]/20 text-[#8b5cf6]">
              {selectedIssue.severity}
            </span>
          </div>
        </div>

        {/* Content Body: 2-Column Split */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-3 gap-6">
          {/* Main Area: Description, AI Summary, Comments */}
          <div className="col-span-2 space-y-5">
            {/* AI Executive Summary Card */}
            <div className="p-4 bg-gradient-to-br from-[#8b5cf6]/10 via-[#ccee22]/10 to-transparent border border-[#8b5cf6]/30 rounded-2xl">
              <div className="flex items-center gap-2 text-xs font-bold text-[#8b5cf6] mb-1.5">
                <SparklesIcon className="w-4 h-4" />
                <span>AI Executive Summary & Insights</span>
              </div>
              <p className="text-xs leading-relaxed text-[#1c1917] dark:text-[#f5f5f4]">
                This issue tracks &quot;{selectedIssue.title}&quot; in status {selectedIssue.status}. Assigned to {selectedIssue.assigneeName || 'team'}.
              </p>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-xs font-bold text-[#78716c] uppercase mb-2">Description</h3>
              <div className="p-4 bg-[#fbf9f5] dark:bg-[#121110] border border-[#e7e2d6] dark:border-[#33302a] rounded-2xl text-xs font-mono leading-relaxed text-[#1c1917] dark:text-[#f5f5f4] whitespace-pre-wrap">
                {selectedIssue.description || 'No detailed description provided.'}
              </div>
            </div>

            {/* Linked Git Commits & CI Pipeline Runs */}
            <div>
              <h3 className="text-xs font-bold text-[#78716c] uppercase mb-2">Linked Git Commits & CI Builds</h3>
              <div className="space-y-2">
                {ciRuns.slice(0, 2).map(ci => (
                  <div
                    key={ci.id}
                    className="p-2.5 bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[#3b82f6] font-bold">commit:{ci.commitSha}</span>
                      <span className="text-[#1c1917] dark:text-white font-medium">{ci.workflowName}</span>
                    </div>
                    <span className={`px-2 py-0.5 font-bold text-[10px] rounded-full ${ci.status === 'SUCCESS' ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#3b82f6]/20 text-[#3b82f6] animate-pulse'}`}>
                      {ci.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chronological Activity & Comments */}
            <div>
              <h3 className="text-xs font-bold text-[#78716c] uppercase mb-3">Discussion & Comments ({comments.length})</h3>
              <div className="space-y-3">
                {comments.map(c => (
                  <div key={c.id} className="p-3 bg-[#fbf9f5] dark:bg-[#121110] border border-[#e7e2d6] dark:border-[#33302a] rounded-xl text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[#1c1917] dark:text-white">{c.user}</span>
                      <span className="text-[10px] text-[#78716c]">{c.time}</span>
                    </div>
                    <p className="text-[#78716c] dark:text-[#a8a29e]">{c.text}</p>
                  </div>
                ))}
              </div>

              {/* Comment Input */}
              <form onSubmit={handleAddComment} className="mt-3 flex gap-2">
                <input
                  type="text"
                  placeholder="Add a comment or reference #issue..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  className="flex-1 bg-[#f5f0e6] dark:bg-[#262420] px-3 py-2 text-xs rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-[#1c1917] dark:text-white focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isSubmittingComment}
                  className="px-4 py-2 bg-[#ccee22] hover:bg-[#b8dd11] text-[#1c1917] font-bold text-xs rounded-xl shadow-xs transition-transform active:scale-95 disabled:opacity-50"
                >
                  {isSubmittingComment ? 'Sending...' : 'Comment'}
                </button>
              </form>
            </div>
          </div>

          {/* Right Sidebar: Issue Metadata */}
          <div className="space-y-4 border-l border-[#e7e2d6] dark:border-[#33302a] pl-6 text-xs">
            <div>
              <span className="block text-[11px] font-bold text-[#78716c] uppercase mb-1">Assignee</span>
              <div className="font-semibold text-[#1c1917] dark:text-white flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#ff7a38] text-white text-[10px] flex items-center justify-center font-bold">
                  {selectedIssue.assigneeName?.[0] || 'U'}
                </div>
                <span>{selectedIssue.assigneeName || 'Unassigned'}</span>
              </div>
            </div>

            <div>
              <span className="block text-[11px] font-bold text-[#78716c] uppercase mb-1">Reporter</span>
              <div className="font-medium text-[#78716c] dark:text-[#a8a29e]">
                {selectedIssue.reporterName || 'Admin'}
              </div>
            </div>

            <div>
              <span className="block text-[11px] font-bold text-[#78716c] uppercase mb-1">Target Milestone</span>
              <div className="font-semibold text-[#1c1917] dark:text-white">
                {selectedIssue.milestone || 'Sprint 1'}
              </div>
            </div>

            <div>
              <span className="block text-[11px] font-bold text-[#78716c] uppercase mb-1">Target Version</span>
              <div className="font-mono text-[#3b82f6]">
                {selectedIssue.version || 'v1.0.0'}
              </div>
            </div>

            <div>
              <span className="block text-[11px] font-bold text-[#78716c] uppercase mb-1">Labels</span>
              <div className="flex flex-wrap gap-1.5">
                {selectedIssue.labels.map((l, i) => (
                  <span key={i} className="px-2 py-0.5 text-[10px] font-semibold bg-[#f5f0e6] dark:bg-[#262420] rounded-md border border-[#e7e2d6] dark:border-[#33302a] text-[#78716c]">
                    #{l}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-[11px] font-bold text-[#78716c] uppercase mb-1">Created At</span>
              <div className="text-[#78716c] text-[11px]">
                {new Date(selectedIssue.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
