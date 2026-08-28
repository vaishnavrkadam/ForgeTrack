'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '../../lib/store';
import { useSound } from '../sound/SoundProvider';
import { BugMascot } from '../mascot/BugMascot';
import { CloseIcon, CheckIcon } from '../ui/Icons';
import { api } from '../../lib/api';

interface InviteMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InviteMembersModal: React.FC<InviteMembersModalProps> = ({ isOpen, onClose }) => {
  const { currentOrg, selectedProject } = useStore();
  const { playSuccessSound, playClickSound } = useSound();

  const [mode, setMode] = useState<'link' | 'email'>('link');
  const [role, setRole] = useState('DEVELOPER');
  const [email, setEmail] = useState('');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Automatically generate link when opened
  const generateLink = async (targetRole: string = role) => {
    if (!currentOrg) return;
    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const data = await api.post(`/organizations/${currentOrg.id}/invitations/link`, {
        role: targetRole,
      });
      if (data && data.token) {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        setInviteUrl(`${origin}/join?token=${data.token}`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate invite link.');
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (isOpen && currentOrg) {
      generateLink(role);
      setIsCopied(false);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, currentOrg]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (!inviteUrl) return;
    playClickSound();
    navigator.clipboard.writeText(inviteUrl);
    setIsCopied(true);
    playSuccessSound();
    setTimeout(() => setIsCopied(false), 3000);
  };

  const handleRoleChange = (newRole: string) => {
    setRole(newRole);
    if (mode === 'link') {
      generateLink(newRole);
    }
  };

  const handleSendEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !currentOrg) return;

    setIsGenerating(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const data = await api.post(`/organizations/${currentOrg.id}/invitations`, {
        email: email.trim(),
        role,
      });

      playSuccessSound();
      setSuccessMsg(`Invitation created for ${email.trim()}! Link: ${data.inviteUrl || inviteUrl}`);
      setEmail('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send invitation.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-3xl shadow-2xl p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e7e2d6] dark:border-[#33302a] pb-3">
          <div className="flex items-center gap-2.5">
            <BugMascot state="happy" size={28} />
            <div>
              <h2 className="text-sm font-bold text-[#1c1917] dark:text-white">
                Invite Team Members
              </h2>
              <span className="text-[11px] text-[#78716c]">
                {currentOrg?.name || 'Workspace'} • {selectedProject?.key || 'Team'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#78716c] hover:text-[#1c1917] dark:hover:text-white p-1 rounded-lg"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch: Shareable Link vs Direct Email */}
        <div className="flex gap-1.5 p-1 bg-[#f5f0e6] dark:bg-[#262420] rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setMode('link')}
            className={`flex-1 py-1.5 rounded-lg transition-colors ${
              mode === 'link'
                ? 'bg-white dark:bg-[#1c1b18] text-[#1c1917] dark:text-white shadow-xs'
                : 'text-[#78716c] hover:text-[#1c1917]'
            }`}
          >
            🔗 Shareable Link
          </button>
          <button
            type="button"
            onClick={() => setMode('email')}
            className={`flex-1 py-1.5 rounded-lg transition-colors ${
              mode === 'email'
                ? 'bg-white dark:bg-[#1c1b18] text-[#1c1917] dark:text-white shadow-xs'
                : 'text-[#78716c] hover:text-[#1c1917]'
            }`}
          >
            ✉️ Email Invitation
          </button>
        </div>

        {successMsg && (
          <div className="p-3 bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 rounded-xl text-xs font-semibold break-all">
            {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 rounded-xl text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Role Selector */}
        <div>
          <label className="block text-[11px] font-bold text-[#78716c] uppercase mb-1">
            Access Role for Invitee
          </label>
          <select
            value={role}
            onChange={e => handleRoleChange(e.target.value)}
            className="w-full bg-[#f5f0e6] dark:bg-[#262420] px-3 py-2 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-xs font-semibold text-[#1c1917] dark:text-white focus:outline-none"
          >
            <option value="DEVELOPER">Engineer / Developer (Create & transition issues)</option>
            <option value="MAINTAINER">Lead / Maintainer (Manage metadata & milestones)</option>
            <option value="ADMIN">Administrator (Full workspace controls)</option>
            <option value="VIEWER">Viewer (Read-only access)</option>
          </select>
        </div>

        {mode === 'link' ? (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-[#78716c] uppercase mb-1">
                Instant Shareable Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteUrl || (isGenerating ? 'Generating link...' : 'Loading...')}
                  className="flex-1 bg-[#f5f0e6] dark:bg-[#262420] px-3 py-2 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-xs font-mono text-[#1c1917] dark:text-white select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  disabled={!inviteUrl || isGenerating}
                  className="px-4 py-2 bg-[#ccee22] hover:bg-[#b8dd11] active:scale-95 text-[#1c1917] font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isCopied ? (
                    <>
                      <CheckIcon className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <span>Copy Link</span>
                  )}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-[#78716c] leading-relaxed">
              Anyone with this link can immediately join your workspace as a <strong className="text-[#1c1917] dark:text-white">{role}</strong> upon opening the link.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSendEmailInvite} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-[#78716c] uppercase mb-1">
                Colleague Email
              </label>
              <input
                type="email"
                required
                placeholder="engineer@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-[#f5f0e6] dark:bg-[#262420] px-3.5 py-2 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-xs text-[#1c1917] dark:text-white focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 text-xs font-semibold text-[#78716c] hover:bg-[#f5f0e6] dark:hover:bg-[#262420] rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isGenerating}
                className="flex-1 py-2 bg-[#ccee22] hover:bg-[#b8dd11] text-[#1c1917] font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50"
              >
                {isGenerating ? 'Creating...' : 'Create Invite'}
              </button>
            </div>
          </form>
        )}

        <div className="pt-2 border-t border-[#e7e2d6] dark:border-[#33302a] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-[#78716c] hover:text-[#1c1917] dark:hover:text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
