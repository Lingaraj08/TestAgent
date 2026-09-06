'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Search,
  FileText,
  Terminal,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';
import type { OperationalEvent } from '@/agents/types';

interface ActivityPanelProps {
  events: OperationalEvent[];
  isRunning: boolean;
}

export function ActivityPanel({ events, isRunning }: ActivityPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (events.length === 0) return null;

  const latestEvent = events[events.length - 1];

  const getEventIcon = (event: OperationalEvent) => {
    switch (event.type) {
      case 'planning':
        return <Sparkles className="w-3.5 h-3.5 text-blue-400" />;
      case 'tool_start':
        if (event.toolName === 'web_search') {
          return <Search className="w-3.5 h-3.5 text-sky-400" />;
        }
        if (event.toolName === 'execute_code') {
          return <Terminal className="w-3.5 h-3.5 text-emerald-400" />;
        }
        if (event.toolName?.startsWith('generate_')) {
          return <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />;
        }
        return <FileText className="w-3.5 h-3.5 text-blue-400" />;
      case 'tool_complete':
      case 'done':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
      case 'verifying':
        return <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />;
      case 'error':
      case 'tool_error':
        return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
      default:
        return <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full my-3 px-4">
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-sm overflow-hidden shadow-xs">
        {/* Header summary bar */}
        <div
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-between px-3.5 py-2.5 cursor-pointer select-none hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
        >
          <div className="flex items-center gap-2 min-w-0">
            {isRunning ? (
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            )}
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
              {isRunning ? 'Agent Working...' : 'Execution Process'}
            </span>
            <span className="text-[11px] text-slate-400 truncate max-w-sm hidden sm:inline">
              — {latestEvent?.message || 'Ready'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>{events.length} event{events.length === 1 ? '' : 's'}</span>
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </div>
        </div>

        {/* Expanded event list */}
        {!collapsed && (
          <div className="border-t border-slate-100 dark:border-slate-800/80 px-3.5 py-2.5 max-h-48 overflow-y-auto space-y-2">
            {events.map((evt) => (
              <div key={evt.id} className="flex items-start gap-2.5 text-xs">
                <div className="mt-0.5 shrink-0">{getEventIcon(evt)}</div>
                <div className="flex-1 text-slate-600 dark:text-slate-300 leading-tight">
                  {evt.message}
                </div>
                <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                  {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
