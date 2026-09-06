'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Server,
  Key,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  Brain,
  Wrench,
  Loader2,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import type { Provider, Model } from '@/types/database';

export function ProviderManager() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  // New Provider Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1');
  const [apiKey, setApiKey] = useState('');
  const [addingProvider, setAddingProvider] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [provRes, modRes] = await Promise.all([
        fetch('/api/providers'),
        fetch('/api/models'),
      ]);

      if (provRes.ok) {
        const data = await provRes.json();
        setProviders(data.providers || []);
      }
      if (modRes.ok) {
        const data = await modRes.json();
        setModels(data.models || []);
      }
    } catch (e) {
      console.error('Failed to load providers/models:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setAddingProvider(true);

    try {
      const res = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          baseUrl: baseUrl.trim(),
          apiKey: apiKey.trim(),
          type: 'openai-compatible',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add provider');
      }

      // Reset form
      setName('');
      setApiKey('');
      setShowAddForm(false);
      await fetchData();

      // Automatically test connection for new provider
      if (data.provider?.id) {
        handleTestConnection(data.provider.id);
      }
    } catch (err: any) {
      setAddError(err.message || 'Error adding provider');
    } finally {
      setAddingProvider(false);
    }
  };

  const handleTestConnection = async (providerId: string) => {
    setTestingId(providerId);
    setTestResults((prev) => ({
      ...prev,
      [providerId]: { success: false, message: 'Testing connection...' },
    }));

    try {
      const res = await fetch(`/api/providers/${providerId}/test`, {
        method: 'POST',
      });

      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [providerId]: {
          success: data.success,
          message: data.message || (data.success ? 'Connection successful!' : 'Connection failed'),
        },
      }));

      // Refresh data to show discovered models & updated status
      await fetchData();
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [providerId]: {
          success: false,
          message: err.message || 'Network error while testing connection',
        },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handleDeleteProvider = async (id: string) => {
    if (!confirm('Are you sure you want to delete this provider and its discovered models?')) return;

    try {
      const res = await fetch(`/api/providers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error('Delete provider error:', e);
    }
  };

  const handleToggleProvider = async (provider: Provider) => {
    try {
      const res = await fetch(`/api/providers/${provider.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: !provider.is_enabled }),
      });
      if (res.ok) {
        setProviders((prev) =>
          prev.map((p) => (p.id === provider.id ? { ...p, is_enabled: !p.is_enabled } : p))
        );
      }
    } catch (e) {
      console.error('Toggle provider error:', e);
    }
  };

  // Preset templates for quick setup
  const presets = [
    { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
    { name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1' },
    { name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1' },
    { name: 'Together AI', baseUrl: 'https://api.together.xyz/v1' },
    { name: 'Mistral AI', baseUrl: 'https://api.mistral.ai/v1' },
    { name: 'Local Ollama', baseUrl: 'http://localhost:11434/v1' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">AI Providers & Models</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Connect any OpenAI-compatible provider. Available models are discovered dynamically.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Provider</span>
        </button>
      </div>

      {/* Add Provider Modal / Card */}
      {showAddForm && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xl space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Configure New AI Provider</h2>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm"
            >
              Cancel
            </button>
          </div>

          {/* Quick presets */}
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Quick Templates
            </div>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => {
                    setName(p.name);
                    setBaseUrl(p.baseUrl);
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-[#141e33] hover:bg-slate-200 dark:hover:bg-[#1c2a47] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 transition"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {addError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{addError}</span>
            </div>
          )}

          <form onSubmit={handleAddProvider} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Provider Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. OpenAI, OpenRouter, Groq"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#141e33] border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  API Base URL
                </label>
                <input
                  type="url"
                  required
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#141e33] border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                API Key
              </label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#141e33] border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Your key is encrypted on the server with AES-256 and never transmitted to client browsers.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addingProvider}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition shadow-sm disabled:opacity-50"
              >
                {addingProvider ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save & Discover Models'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Providers List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Server className="w-5 h-5 text-blue-500" />
          <span>Configured Providers ({providers.length})</span>
        </h2>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400 animate-pulse">Loading providers...</div>
        ) : providers.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-[#0f172a] border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-3">
            <Server className="w-10 h-10 text-slate-400 mx-auto" />
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">No AI providers configured</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Add your OpenAI, OpenRouter, Groq, or custom API key to discover models and start chatting.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Your First Provider</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {providers.map((p) => {
              const isTesting = testingId === p.id;
              const testResult = testResults[p.id];
              const provModels = models.filter((m) => m.provider_id === p.id);

              return (
                <div
                  key={p.id}
                  className="rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#141e33] flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold">
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white text-base">
                            {p.name}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                              p.connection_status === 'connected'
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                                : p.connection_status === 'failed'
                                ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}
                          >
                            {p.connection_status === 'connected' ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : p.connection_status === 'failed' ? (
                              <AlertCircle className="w-3 h-3" />
                            ) : null}
                            <span className="capitalize">{p.connection_status}</span>
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="truncate max-w-xs">{p.base_url}</span>
                          <span>•</span>
                          <span>
                            {p.last_tested_at
                              ? `Tested ${formatRelativeTime(p.last_tested_at)}`
                              : 'Untested'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleProvider(p)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition ${
                          p.is_enabled
                            ? 'bg-slate-50 dark:bg-[#141e33] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200'
                        }`}
                      >
                        {p.is_enabled ? 'Enabled' : 'Disabled'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTestConnection(p.id)}
                        disabled={isTesting}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-xs font-medium transition disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                        <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteProvider(p.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                        title="Delete Provider"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {testResult && (
                    <div
                      className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                        testResult.success
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                      }`}
                    >
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                      )}
                      <span>{testResult.message}</span>
                    </div>
                  )}

                  {/* Discovered Models Accordion/List */}
                  {provModels.length > 0 && (
                    <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3">
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                        Discovered Models ({provModels.length})
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                        {provModels.map((m) => (
                          <div
                            key={m.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#141e33] border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300"
                          >
                            <span className="font-medium">{m.display_name}</span>
                            {m.supports_vision && (
                              <span title="Vision"><Eye className="w-2.5 h-2.5 text-blue-400" /></span>
                            )}
                            {m.supports_reasoning && (
                              <span title="Reasoning"><Brain className="w-2.5 h-2.5 text-purple-400" /></span>
                            )}
                            {m.supports_tools && (
                              <span title="Tools"><Wrench className="w-2.5 h-2.5 text-amber-400" /></span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
