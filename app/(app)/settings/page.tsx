'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/components/theme-provider';
import { User, Moon, Sun, Monitor, Cpu, ShieldCheck } from 'lucide-react';
import { UsageSummary } from '@/components/usage-summary';

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, [supabase]);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#090d16] p-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Workspace Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your personal profile, appearance, and AI provider configurations.
          </p>
        </div>

        {/* Profile Card */}
        <div className="rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <User className="w-5 h-5 text-blue-500" />
            <span>User Profile</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Email Address</div>
              <div className="font-medium text-slate-800 dark:text-slate-200">
                {user?.email || 'Loading...'}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">User ID</div>
              <div className="font-mono text-xs text-slate-600 dark:text-slate-400 truncate">
                {user?.id || '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Appearance Card */}
        <div className="rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Sun className="w-5 h-5 text-blue-500" />
            <span>Appearance & Theme</span>
          </h2>

          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'dark', label: 'Dark Mode', icon: Moon },
              { id: 'light', label: 'Light Mode', icon: Sun },
              { id: 'system', label: 'System Default', icon: Monitor },
            ].map((t) => {
              const Icon = t.icon;
              const isSelected = theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id as any)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-sm font-medium transition ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#141e33] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#192640]'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* AI Providers Shortcut */}
        <div className="rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-6 flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-blue-500" />
              <span>AI Providers & Models</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure OpenAI, OpenRouter, Groq, or custom endpoints and discover models.
            </p>
          </div>

          <Link
            href="/models"
            className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition shadow-sm"
          >
            Manage Providers &rarr;
          </Link>
        </div>

        {/* Security / System Info */}
        <UsageSummary />

        {/* Security / System Info */}
        <div className="rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-6 space-y-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <span>Security & Data Isolation</span>
          </h2>
          <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed space-y-1.5">
            <p>• All database queries are protected by PostgreSQL Row Level Security (RLS).</p>
            <p>• Provider API keys are encrypted at rest with AES-256-GCM and never shared client-side.</p>
            <p>• Files and conversations are strictly isolated to your authenticated account ID.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
