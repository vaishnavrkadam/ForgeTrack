'use client';

import React, { useState } from 'react';
import { useStore } from '../../lib/store';
import { useSound } from '../sound/SoundProvider';
import { BugMascot } from '../mascot/BugMascot';
import { createProject, importProjectFromGitHub } from '../../lib/api/issues';
import { api } from '../../lib/api';

export const ProjectSetupScreen: React.FC = () => {
  const { currentOrg, reloadProjects, setSelectedProject } = useStore();
  const { playSuccessSound, playClickSound } = useSound();

  const [activeTab, setActiveTab] = useState<'create' | 'github' | 'join'>('create');

  // Create Project form state
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('PRIVATE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // GitHub Import form state
  const [repoOwner, setRepoOwner] = useState('vaishnavrkadam');
  const [repoName, setRepoName] = useState('ForgeTrack');
  const [customKey, setCustomKey] = useState('');

  // Join form state
  const [inviteToken, setInviteToken] = useState('');

  const handleNameChange = (val: string) => {
    setName(val);
    if (!key || key.length < 5) {
      const generated = val.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
      if (generated) setKey(generated);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !key.trim()) return;
    if (!currentOrg) {
      setErrorMsg('Active organization context is missing. Please sign in again.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const created = await createProject(currentOrg.id, {
        name: name.trim(),
        key: key.trim().toUpperCase(),
        description: description.trim(),
        visibility,
      });

      playSuccessSound();
      await reloadProjects();
      setSelectedProject(created);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportGitHub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoOwner.trim() || !repoName.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const imported = await importProjectFromGitHub({
        repoOwner: repoOwner.trim(),
        repoName: repoName.trim(),
        key: customKey.trim().toUpperCase() || undefined,
        description: `Imported repository ${repoOwner}/${repoName}`,
      });

      playSuccessSound();
      await reloadProjects();
      setSelectedProject(imported);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to import repository from GitHub.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteToken.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await api.post(`/organizations/${currentOrg?.id || 'default'}/invitations/accept`, {
        token: inviteToken.trim(),
      });

      playSuccessSound();
      await reloadProjects();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to accept invitation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 select-none animate-in fade-in duration-300 max-w-2xl mx-auto">
      <div className="text-center space-y-3 mb-8">
        <div className="inline-flex p-3 bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-3xl shadow-sm mb-2">
          <BugMascot state="happy" size={48} className="animate-bug-bounce" />
        </div>
        <h1 className="text-2xl font-black text-[#1c1917] dark:text-white tracking-tight">
          Welcome to ForgeTrack
        </h1>
        <p className="text-xs text-[#78716c] max-w-md mx-auto">
          You haven&apos;t joined or created a project in this workspace yet. Create a new tracker or import an existing repository to start.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-[#f5f0e6] dark:bg-[#262420] rounded-2xl border border-[#e7e2d6] dark:border-[#33302a] mb-6 text-xs font-bold w-full max-w-md">
        <button
          onClick={() => {
            playClickSound();
            setActiveTab('create');
          }}
          className={`flex-1 py-2 rounded-xl transition-all ${
            activeTab === 'create'
              ? 'bg-white dark:bg-[#1c1b18] text-[#1c1917] dark:text-white shadow-xs'
              : 'text-[#78716c] hover:text-[#1c1917]'
          }`}
        >
          ✨ New Project
        </button>

        <button
          onClick={() => {
            playClickSound();
            setActiveTab('github');
          }}
          className={`flex-1 py-2 rounded-xl transition-all ${
            activeTab === 'github'
              ? 'bg-white dark:bg-[#1c1b18] text-[#1c1917] dark:text-white shadow-xs'
              : 'text-[#78716c] hover:text-[#1c1917]'
          }`}
        >
          🐙 GitHub Import
        </button>

        <button
          onClick={() => {
            playClickSound();
            setActiveTab('join');
          }}
          className={`flex-1 py-2 rounded-xl transition-all ${
            activeTab === 'join'
              ? 'bg-white dark:bg-[#1c1b18] text-[#1c1917] dark:text-white shadow-xs'
              : 'text-[#78716c] hover:text-[#1c1917]'
          }`}
        >
          🔑 Join Invite
        </button>
      </div>

      {/* Card Body */}
      <div className="w-full max-w-md bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-3xl p-6 shadow-xl space-y-4">
        {errorMsg && (
          <div className="p-3 bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 rounded-xl text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {activeTab === 'create' && (
          <form onSubmit={handleCreateProject} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-[#78716c] uppercase mb-1">Project Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Core Engine Services"
                value={name}
                onChange={e => handleNameChange(e.target.value)}
                className="w-full bg-[#f5f0e6] dark:bg-[#262420] px-3.5 py-2 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-xs text-[#1c1917] dark:text-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#78716c] uppercase mb-1">Project Key</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="CORE"
                  value={key}
                  onChange={e => setKey(e.target.value.toUpperCase())}
                  className="w-full bg-[#f5f0e6] dark:bg-[#262420] px-3.5 py-2 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-xs font-mono font-bold text-[#1c1917] dark:text-white focus:outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#78716c] uppercase mb-1">Visibility</label>
                <select
                  value={visibility}
                  onChange={e => setVisibility(e.target.value)}
                  className="w-full bg-[#f5f0e6] dark:bg-[#262420] px-3 py-2 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-xs font-semibold text-[#1c1917] dark:text-white focus:outline-none"
                >
                  <option value="PRIVATE">🔒 Private</option>
                  <option value="PUBLIC">🌐 Public</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#78716c] uppercase mb-1">Description (Optional)</label>
              <textarea
                rows={2}
                placeholder="Briefly describe what this project tracks..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-[#f5f0e6] dark:bg-[#262420] p-3 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-xs text-[#1c1917] dark:text-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-[#ccee22] hover:bg-[#b8dd11] active:scale-[0.98] text-[#1c1917] font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Creating Project & Workflow...' : 'Create Project'}
            </button>
          </form>
        )}

        {activeTab === 'github' && (
          <form onSubmit={handleImportGitHub} className="space-y-3.5">
            <div className="p-3 bg-[#f5f0e6] dark:bg-[#262420] rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-xs text-[#78716c]">
              ForgeTrack will connect to the GitHub repository, register issue sync, and seed your engineering workflow.
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#78716c] uppercase mb-1">Repository Owner</label>
              <input
                type="text"
                required
                placeholder="e.g. vaishnavrkadam"
                value={repoOwner}
                onChange={e => setRepoOwner(e.target.value)}
                className="w-full bg-[#f5f0e6] dark:bg-[#262420] px-3.5 py-2 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-xs text-[#1c1917] dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#78716c] uppercase mb-1">Repository Name</label>
              <input
                type="text"
                required
                placeholder="e.g. ForgeTrack"
                value={repoName}
                onChange={e => setRepoName(e.target.value)}
                className="w-full bg-[#f5f0e6] dark:bg-[#262420] px-3.5 py-2 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-xs text-[#1c1917] dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#78716c] uppercase mb-1">Custom Issue Prefix Key (Optional)</label>
              <input
                type="text"
                maxLength={6}
                placeholder="e.g. FT"
                value={customKey}
                onChange={e => setCustomKey(e.target.value.toUpperCase())}
                className="w-full bg-[#f5f0e6] dark:bg-[#262420] px-3.5 py-2 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-xs font-mono font-bold text-[#1c1917] dark:text-white focus:outline-none uppercase"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-[#24292f] hover:bg-[#1b1f23] text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{isSubmitting ? 'Importing from GitHub...' : 'Import Repository'}</span>
            </button>
          </form>
        )}

        {activeTab === 'join' && (
          <form onSubmit={handleAcceptInvite} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-[#78716c] uppercase mb-1">Invitation Secret Token</label>
              <input
                type="text"
                required
                placeholder="Paste the invitation token from your email"
                value={inviteToken}
                onChange={e => setInviteToken(e.target.value)}
                className="w-full bg-[#f5f0e6] dark:bg-[#262420] px-3.5 py-2 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-xs font-mono text-[#1c1917] dark:text-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-[#ccee22] hover:bg-[#b8dd11] text-[#1c1917] font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Joining Workspace...' : 'Accept Invitation'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
