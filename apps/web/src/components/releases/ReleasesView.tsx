'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../../lib/store';
import { BugMascot } from '../mascot/BugMascot';
import { api } from '../../lib/api';
import { useSound } from '../sound/SoundProvider';

export const ReleasesView: React.FC = () => {
  const { selectedProject, issues } = useStore();
  const { playSuccessSound, playClickSound } = useSound();

  const [versions, setVersions] = useState<any[]>([]);
  const [ciRuns, setCiRuns] = useState<any[]>([]);

  // Modal states
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [versionName, setVersionName] = useState('');
  const [versionDescription, setVersionDescription] = useState('');
  const [versionReleaseDate, setVersionReleaseDate] = useState('');
  const [isSubmittingVersion, setIsSubmittingVersion] = useState(false);

  const [isCiModalOpen, setIsCiModalOpen] = useState(false);
  const [ciCommitSha, setCiCommitSha] = useState('');
  const [ciBranch, setCiBranch] = useState('main');
  const [ciWorkflow, setCiWorkflow] = useState('CI & Automated Tests');
  const [ciStatus, setCiStatus] = useState<'SUCCESS' | 'FAILED' | 'RUNNING'>('SUCCESS');
  const [ciUrl, setCiUrl] = useState('');
  const [isSubmittingCi, setIsSubmittingCi] = useState(false);

  const loadData = useCallback(async () => {
    if (!selectedProject) return;
    try {
      const [versRes, ciRes] = await Promise.allSettled([
        api.get<any[]>(`/projects/${selectedProject.id}/versions`),
        api.get<any[]>(`/projects/${selectedProject.id}/ci-runs`),
      ]);

      if (versRes.status === 'fulfilled' && Array.isArray(versRes.value)) {
        setVersions(versRes.value);
      }
      if (ciRes.status === 'fulfilled' && Array.isArray(ciRes.value)) {
        setCiRuns(ciRes.value);
      }
    } catch (err) {
      console.warn('Failed to load release data:', err);
    }
  }, [selectedProject]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !versionName.trim()) return;

    setIsSubmittingVersion(true);
    try {
      await api.post(`/projects/${selectedProject.id}/versions`, {
        name: versionName.trim(),
        description: versionDescription.trim() || undefined,
        releaseDate: versionReleaseDate || undefined,
      });

      playSuccessSound();
      setIsVersionModalOpen(false);
      setVersionName('');
      setVersionDescription('');
      setVersionReleaseDate('');
      await loadData();
    } catch (err) {
      console.error('Failed to create version:', err);
    } finally {
      setIsSubmittingVersion(false);
    }
  };

  const handleRecordCiRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !ciCommitSha.trim()) return;

    setIsSubmittingCi(true);
    try {
      await api.post(`/projects/${selectedProject.id}/ci-runs`, {
        commitSha: ciCommitSha.trim(),
        branch: ciBranch.trim(),
        workflowName: ciWorkflow.trim(),
        status: ciStatus,
        url: ciUrl.trim() || `https://github.com/${selectedProject.key}/commit/${ciCommitSha.trim()}`,
      });

      playSuccessSound();
      setIsCiModalOpen(false);
      setCiCommitSha('');
      setCiUrl('');
      await loadData();
    } catch (err) {
      console.error('Failed to record CI run:', err);
    } finally {
      setIsSubmittingCi(false);
    }
  };

  // Compute metrics for each version based on live issues
  const releaseCards = versions.map(v => {
    const versionIssues = issues.filter(
      i => i.versionId === v.id || i.version?.toLowerCase() === v.name?.toLowerCase(),
    );
    const totalIssues = versionIssues.length;
    const doneIssues = versionIssues.filter(i => i.statusCategory === 'DONE' || i.status === 'CLOSED' || i.status === 'RESOLVED').length;
    const blockingDefects = versionIssues.filter(
      i => (i.severity === 'BLOCKER' || i.priority === 'URGENT') && i.statusCategory !== 'DONE',
    ).length;

    const successfulRuns = ciRuns.filter(r => r.status === 'SUCCESS').length;
    const ciPassRate = ciRuns.length > 0 ? Math.round((successfulRuns / ciRuns.length) * 100) : 100;
    const isHealthy = blockingDefects === 0 && (ciRuns.length === 0 || ciPassRate >= 80);

    return {
      id: v.id,
      name: v.name,
      releaseDate: v.releaseDate ? new Date(v.releaseDate).toLocaleDateString() : 'Continuous Delivery',
      status: v.status || 'ACTIVE',
      totalIssues,
      doneIssues,
      blockingDefects,
      ciPassRate,
      health: isHealthy ? 'HEALTHY' : 'AT_RISK',
    };
  });

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1c1917] dark:text-white">Releases & CI Intelligence</h1>
          <p className="text-xs text-[#78716c]">Release health monitoring, automated build tracking, and blocker defect alerts.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              playClickSound();
              setIsCiModalOpen(true);
            }}
            className="px-3.5 py-1.5 bg-[#f5f0e6] dark:bg-[#262420] hover:bg-[#eae3d5] text-[#1c1917] dark:text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            ⚡ Record CI Run
          </button>

          <button
            onClick={() => {
              playClickSound();
              setIsVersionModalOpen(true);
            }}
            className="px-3.5 py-1.5 bg-[#ccee22] hover:bg-[#b8dd11] active:scale-[0.98] text-[#1c1917] rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            + New Milestone
          </button>
        </div>
      </div>

      {/* Release Versions Cards */}
      {releaseCards.length === 0 ? (
        <div className="p-8 bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-3xl text-center space-y-3 shadow-2xs">
          <BugMascot state="happy" size={40} className="mx-auto" />
          <h3 className="font-bold text-sm text-[#1c1917] dark:text-white">No active release milestones</h3>
          <p className="text-xs text-[#78716c] max-w-sm mx-auto">
            Create milestone versions or sync release tags for {selectedProject?.name || 'your project'} to track release quality and blocker defect burndown.
          </p>
          <button
            onClick={() => {
              playClickSound();
              setIsVersionModalOpen(true);
            }}
            className="px-4 py-2 bg-[#ccee22] text-[#1c1917] font-bold text-xs rounded-xl shadow-xs cursor-pointer inline-block"
          >
            Create First Milestone
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {releaseCards.map(rel => {
            const percent = rel.totalIssues > 0 ? Math.round((rel.doneIssues / rel.totalIssues) * 100) : 0;
            return (
              <div
                key={rel.id}
                className="p-5 bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-3xl space-y-4 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-[#1c1917] dark:text-white">{rel.name}</h3>
                    <span className="text-[11px] text-[#78716c]">Target Date: {rel.releaseDate}</span>
                  </div>
                  <span
                    className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                      rel.health === 'HEALTHY'
                        ? 'bg-[#10b981]/20 text-[#10b981]'
                        : 'bg-[#ff6b57]/20 text-[#ff6b57]'
                    }`}
                  >
                    {rel.health}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-[#78716c]">Sprint Progress</span>
                    <span className="text-[#1c1917] dark:text-white">
                      {percent}% ({rel.doneIssues}/{rel.totalIssues} resolved)
                    </span>
                  </div>
                  <div className="w-full h-3 bg-[#f5f0e6] dark:bg-[#262420] rounded-full overflow-hidden">
                    <div className="h-full bg-[#ccee22] transition-all duration-300" style={{ width: `${percent}%` }} />
                  </div>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#e7e2d6] dark:border-[#33302a] text-center text-xs">
                  <div>
                    <span className="text-[#78716c] text-[10px] uppercase font-bold block">CI Pass Rate</span>
                    <span className="font-bold text-[#10b981]">{rel.ciPassRate}%</span>
                  </div>
                  <div>
                    <span className="text-[#78716c] text-[10px] uppercase font-bold block">Blockers</span>
                    <span className={`font-bold ${rel.blockingDefects > 0 ? 'text-[#ff6b57]' : 'text-[#78716c]'}`}>
                      {rel.blockingDefects}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#78716c] text-[10px] uppercase font-bold block">Status</span>
                    <span className="font-bold text-[#1c1917] dark:text-white">{rel.status}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Linked CI Build Runs */}
      <div className="bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-3xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BugMascot state="working" size={24} />
            <h3 className="font-bold text-sm text-[#1c1917] dark:text-white">Recent CI / Release Runs</h3>
          </div>
          <span className="text-xs text-[#78716c]">Automated commit integration</span>
        </div>

        {ciRuns.length === 0 ? (
          <div className="p-6 bg-[#fbf9f5] dark:bg-[#121110] border border-[#e7e2d6] dark:border-[#33302a] rounded-2xl text-center text-xs text-[#78716c]">
            No CI runs recorded yet. Record a test run or configure GitHub Actions webhooks to stream live build statuses.
          </div>
        ) : (
          <div className="space-y-2">
            {ciRuns.map(run => (
              <div
                key={run.id}
                className="p-3 bg-[#fbf9f5] dark:bg-[#121110] border border-[#e7e2d6] dark:border-[#33302a] rounded-2xl flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-[#3b82f6]">commit:{run.commitSha?.substring(0, 8) || run.commitSha}</span>
                  <span className="font-semibold text-[#1c1917] dark:text-white">{run.workflowName}</span>
                  <span className="text-[#78716c] text-[11px]">
                    {run.startedAt ? new Date(run.startedAt).toLocaleTimeString() : 'Recent'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      run.status === 'SUCCESS'
                        ? 'bg-[#10b981]/20 text-[#10b981]'
                        : run.status === 'FAILED'
                        ? 'bg-[#ff6b57]/20 text-[#ff6b57]'
                        : 'bg-[#3b82f6]/20 text-[#3b82f6] animate-pulse'
                    }`}
                  >
                    {run.status}
                  </span>
                  {run.url && (
                    <a
                      href={run.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#78716c] hover:text-[#1c1917] dark:hover:text-white underline font-medium"
                    >
                      Logs ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Create Version Milestone */}
      {isVersionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-3xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h2 className="text-base font-bold text-[#1c1917] dark:text-white">Create Release Milestone</h2>
            <form onSubmit={handleCreateVersion} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#78716c] uppercase mb-1">Milestone Name / Version</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. v1.0.0 or Sprint 1"
                  value={versionName}
                  onChange={e => setVersionName(e.target.value)}
                  className="w-full bg-[#f5f0e6] dark:bg-[#262420] px-3.5 py-2 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-xs text-[#1c1917] dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#78716c] uppercase mb-1">Target Release Date</label>
                <input
                  type="date"
                  value={versionReleaseDate}
                  onChange={e => setVersionReleaseDate(e.target.value)}
                  className="w-full bg-[#f5f0e6] dark:bg-[#262420] px-3.5 py-2 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-xs text-[#1c1917] dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#78716c] uppercase mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Goals for this release milestone..."
                  value={versionDescription}
                  onChange={e => setVersionDescription(e.target.value)}
                  className="w-full bg-[#f5f0e6] dark:bg-[#262420] p-3 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-xs text-[#1c1917] dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsVersionModalOpen(false)}
                  className="flex-1 py-2 text-xs font-bold text-[#78716c] hover:bg-[#f5f0e6] dark:hover:bg-[#262420] rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVersion}
                  className="flex-1 py-2 bg-[#ccee22] hover:bg-[#b8dd11] text-[#1c1917] font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingVersion ? 'Creating...' : 'Create Milestone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record CI Run */}
      {isCiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-3xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h2 className="text-base font-bold text-[#1c1917] dark:text-white">Record CI Build / Run</h2>
            <form onSubmit={handleRecordCiRun} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#78716c] uppercase mb-1">Commit SHA</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 783f8d3 or full git SHA"
                  value={ciCommitSha}
                  onChange={e => setCiCommitSha(e.target.value)}
                  className="w-full bg-[#f5f0e6] dark:bg-[#262420] px-3.5 py-2 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-xs font-mono text-[#1c1917] dark:text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-[#78716c] uppercase mb-1">Branch</label>
                  <input
                    type="text"
                    value={ciBranch}
                    onChange={e => setCiBranch(e.target.value)}
                    className="w-full bg-[#f5f0e6] dark:bg-[#262420] px-3.5 py-2 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-xs text-[#1c1917] dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#78716c] uppercase mb-1">Status</label>
                  <select
                    value={ciStatus}
                    onChange={e => setCiStatus(e.target.value as any)}
                    className="w-full bg-[#f5f0e6] dark:bg-[#262420] px-3.5 py-2 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-xs font-bold text-[#1c1917] dark:text-white focus:outline-none"
                  >
                    <option value="SUCCESS">✅ SUCCESS</option>
                    <option value="FAILED">❌ FAILED</option>
                    <option value="RUNNING">⏳ RUNNING</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#78716c] uppercase mb-1">Workflow Name</label>
                <input
                  type="text"
                  value={ciWorkflow}
                  onChange={e => setCiWorkflow(e.target.value)}
                  className="w-full bg-[#f5f0e6] dark:bg-[#262420] px-3.5 py-2 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-xs text-[#1c1917] dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#78716c] uppercase mb-1">Build / Logs URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://github.com/..."
                  value={ciUrl}
                  onChange={e => setCiUrl(e.target.value)}
                  className="w-full bg-[#f5f0e6] dark:bg-[#262420] px-3.5 py-2 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-xs text-[#1c1917] dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCiModalOpen(false)}
                  className="flex-1 py-2 text-xs font-bold text-[#78716c] hover:bg-[#f5f0e6] dark:hover:bg-[#262420] rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCi}
                  className="flex-1 py-2 bg-[#ccee22] hover:bg-[#b8dd11] text-[#1c1917] font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingCi ? 'Recording...' : 'Record CI Run'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
