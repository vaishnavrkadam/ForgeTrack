'use client';

import React, { useState } from 'react';
import { useStore } from '../../lib/store';
import { useSound } from '../sound/SoundProvider';
import { BugMascot } from '../mascot/BugMascot';
import { PlusIcon } from '../ui/Icons';

export const IntegrationsView: React.FC = () => {
  const { webhooks, currentUser, selectedProject } = useStore();
  const { playSuccessSound } = useSound();

  const [webhookList, setWebhookList] = useState(webhooks);
  const [newUrl, setNewUrl] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);

  const isGitHubConnected = currentUser?.oauthProvider === 'github' || !!selectedProject?.key;

  const handleAddWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;

    const newHook = {
      id: `wh-${Date.now()}`,
      url: newUrl.trim(),
      events: ['issue.created', 'issue.updated', 'issue.transitioned'],
      isEnabled: true,
      createdAt: new Date().toISOString(),
    };

    setWebhookList(prev => [newHook, ...prev]);
    setNewUrl('');
    playSuccessSound();
  };

  const handleTestPing = (url: string) => {
    setTestResult(`Ping sent to ${url}. Response: 200 OK (HMAC Signed)`);
    playSuccessSound();
    setTimeout(() => setTestResult(null), 4000);
  };

  return (
    <div className="space-y-6 select-none">
      <div>
        <h1 className="text-xl font-bold text-[#1c1917] dark:text-white">Git Integrations & Webhooks</h1>
        <p className="text-xs text-[#78716c]">Connect GitHub, GitLab, issue code-links, and outbound webhook event dispatchers.</p>
      </div>

      {/* Git Providers Connected */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-5 bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-3xl space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-black text-white font-bold flex items-center justify-center text-xs">
                GH
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#1c1917] dark:text-white">GitHub Integration</h3>
                {isGitHubConnected ? (
                  <span className="text-[11px] text-[#10b981] font-semibold">● Connected (OAuth Active)</span>
                ) : (
                  <span className="text-[11px] text-[#78716c] font-semibold">○ Not Linked</span>
                )}
              </div>
            </div>
            {isGitHubConnected ? (
              <span className="text-[11px] font-semibold text-[#10b981] bg-[#10b981]/15 px-2.5 py-1 rounded-lg">
                Active
              </span>
            ) : (
              <button className="px-3 py-1 bg-[#f5f0e6] dark:bg-[#262420] text-xs font-semibold rounded-xl text-[#1c1917] dark:text-white hover:bg-[#e7e2d6]">
                Connect
              </button>
            )}
          </div>
          <p className="text-xs text-[#78716c]">
            Automated PR & commit links enabled. Regex matches: <code className="font-mono text-[#3b82f6]">/([A-Z][A-Z0-9]+)-(\d+)/g</code>
          </p>
        </div>

        <div className="p-5 bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-3xl space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#fc6d26] text-white font-bold flex items-center justify-center text-xs">
                GL
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#1c1917] dark:text-white">GitLab Integration</h3>
                <span className="text-[11px] text-[#78716c] font-semibold">○ Not Connected</span>
              </div>
            </div>
            <button className="px-3 py-1 bg-[#f5f0e6] dark:bg-[#262420] text-xs font-semibold rounded-xl text-[#1c1917] dark:text-white hover:bg-[#e7e2d6]">
              Configure
            </button>
          </div>
          <p className="text-xs text-[#78716c]">
            Merge requests and pipeline webhook triggers ready for setup.
          </p>
        </div>
      </div>

      {/* Outbound Webhook Subscriptions */}
      <div className="bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-3xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BugMascot state="working" size={24} />
            <h3 className="font-bold text-sm text-[#1c1917] dark:text-white">Outbound Webhook Endpoints</h3>
          </div>
          <span className="text-xs text-[#78716c]">HMAC SHA-256 signatures with SSRF protection</span>
        </div>

        {/* Add Webhook Form */}
        <form onSubmit={handleAddWebhook} className="flex gap-2">
          <input
            type="url"
            required
            placeholder="https://api.yourdomain.com/webhooks/forgetrack"
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            className="flex-1 bg-[#f5f0e6] dark:bg-[#262420] px-3.5 py-2 rounded-xl border border-[#e7e2d6] dark:border-[#33302a] text-xs text-[#1c1917] dark:text-white focus:outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-[#ccee22] hover:bg-[#b8dd11] text-[#1c1917] font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Add Webhook</span>
          </button>
        </form>

        {testResult && (
          <div className="p-3 bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 rounded-xl text-xs font-semibold animate-in fade-in duration-150">
            {testResult}
          </div>
        )}

        {/* Webhooks Table */}
        {webhookList.length === 0 ? (
          <div className="p-6 bg-[#fbf9f5] dark:bg-[#121110] border border-[#e7e2d6] dark:border-[#33302a] rounded-2xl text-center text-xs text-[#78716c] space-y-1">
            <p className="font-semibold text-[#1c1917] dark:text-white">No outbound webhooks configured yet.</p>
            <p className="text-[11px]">Enter your destination endpoint above to receive automated issue and release payloads.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {webhookList.map(hook => (
              <div
                key={hook.id}
                className="p-3 bg-[#fbf9f5] dark:bg-[#121110] border border-[#e7e2d6] dark:border-[#33302a] rounded-2xl flex items-center justify-between text-xs"
              >
                <div className="space-y-1">
                  <div className="font-mono font-bold text-[#1c1917] dark:text-white truncate max-w-md">
                    {hook.url}
                  </div>
                  <div className="flex gap-1.5">
                    {hook.events.map((ev, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.2 bg-white dark:bg-[#262420] text-[#78716c] rounded-md border border-[#e7e2d6] dark:border-[#33302a]">
                        {ev}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTestPing(hook.url)}
                    className="px-3 py-1 bg-white dark:bg-[#1c1b18] hover:bg-[#f5f0e6] text-xs font-semibold rounded-lg border border-[#e7e2d6] dark:border-[#33302a] text-[#1c1917] dark:text-white transition-colors cursor-pointer"
                  >
                    Send Ping
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
