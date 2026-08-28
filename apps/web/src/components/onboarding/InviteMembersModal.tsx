'use client';

import React, { useState } from 'react';
import { useStore } from '../../lib/store';
import { useSound } from '../sound/SoundProvider';
import { BugMascot } from '../mascot/BugMascot';
import { CloseIcon } from '../ui/Icons';
import { api } from '../../lib/api';

interface InviteMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InviteMembersModal: React.FC<InviteMembersModalProps> = ({ isOpen, onClose }) => {
  const { currentOrg, selectedProject } = useStore();
  const { playSuccessSound } = useSound();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState('DEVELOPER');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (!currentOrg) throw new Error('No active workspace selected.');

      await api.post(`/organizations/${currentOrg.id}/invitations`, {
        email: email.trim(),
        role,
      });

      playSuccessSound();
      setSuccessMsg(`Invitation sent to ${email.trim()}!`);
      setEmail('');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send invitation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-3xl shadow-2xl p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#e7e2d6] dark:border-[#33302a] pb-3">
          <div className="flex items-center gap-2.5">
            <BugMascot state="happy" size={28} />
            <div>
              <h2 className="text-sm font-bold text-[#1c1917] dark:text-white">
                Invite Team Members
              </h2>
              <span className="text-[11px] text-[#78716c]">
                Collaborate on {selectedProject?.key || 'workspace'}
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

        {successMsg && (
          <div className="p-3 bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 rounded-xl text-xs font-semibold">
            {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 rounded-xl text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSendInvite} className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-[#78716c] uppercase mb-1">Colleague Email</label>
            <input
              type="email"
              required
              placeholder="engineer@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-[#f5f0e6] dark:bg-[#262420] px-3.5 py-2 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-xs text-[#1c1917] dark:text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#78716c] uppercase mb-1">Role Permission</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full bg-[#f5f0e6] dark:bg-[#262420] px-3 py-2 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-xs font-semibold text-[#1c1917] dark:text-white focus:outline-none"
            >
              <option value="DEVELOPER">Engineer / Developer</option>
              <option value="MAINTAINER">Lead / Maintainer</option>
              <option value="ADMIN">Administrator</option>
              <option value="VIEWER">Viewer</option>
            </select>
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
              disabled={isSubmitting}
              className="flex-1 py-2 bg-[#ccee22] hover:bg-[#b8dd11] text-[#1c1917] font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
