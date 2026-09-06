'use client';

import React, { useEffect, useRef } from 'react';
import { Bot, User, AlertCircle } from 'lucide-react';
import { ActivityPanel } from './activity-panel';
import { ArtifactCard } from './artifact-card';
import type { ToolArtifact } from '@/types/tools';
import type { OperationalEvent } from '@/agents/types';

export interface DisplayMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at?: string;
  isStreaming?: boolean;
  artifacts?: ToolArtifact[];
}

interface ChatMessagesProps {
  messages: DisplayMessage[];
  isStreaming: boolean;
  error: string | null;
  activeEvents?: OperationalEvent[];
  activeArtifacts?: ToolArtifact[];
  onQuickPrompt?: (text: string) => void;
}

export function ChatMessages({
  messages,
  isStreaming,
  error,
  activeEvents = [],
  activeArtifacts = [],
  onQuickPrompt,
}: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming, activeEvents, activeArtifacts]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 mb-6">
          <Bot className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          How can Nexus help you today?
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-8">
          Personal AI workspace equipped with autonomous tool use, code execution sandbox, document generation, and live web research.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full text-left">
          {[
            {
              title: 'Create Excel Report',
              desc: 'Generate an .xlsx financial model or budget table',
              prompt: 'Create an Excel spreadsheet model for a quarterly SaaS subscription business with revenue and expenses.',
            },
            {
              title: 'Search the Live Web',
              desc: 'Query online sources with verified citations',
              prompt: 'Search the web for the latest developments in quantum computing in 2025 and 2026.',
            },
            {
              title: 'Run Python Calculations',
              desc: 'Execute Python algorithms in a secure sandbox',
              prompt: 'Run Python code to calculate the first 25 Fibonacci numbers and verify their ratio converges to the Golden Ratio.',
            },
            {
              title: 'Draft Word or PDF Document',
              desc: 'Produce downloadable .docx or .pdf documents',
              prompt: 'Generate a clean Word document executive summary on modern AI agent architectures.',
            },
          ].map((item) => (
            <button
              key={item.title}
              onClick={() => onQuickPrompt?.(item.prompt)}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] hover:bg-slate-50 dark:hover:bg-[#141e33] transition text-left group"
            >
              <div className="font-medium text-xs text-slate-800 dark:text-slate-200 group-hover:text-blue-500 transition">
                {item.title}
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                {item.desc}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6">
      {messages.map((msg, idx) => {
        const isUser = msg.role === 'user';
        return (
          <div
            key={msg.id || idx}
            className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
          >
            <div className={`flex gap-3 max-w-3xl w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
              {!isUser && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`relative rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[85%] md:max-w-[75%] shadow-xs break-words ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-br-xs'
                    : 'bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800/80 rounded-bl-xs'
                }`}
              >
                <div className="whitespace-pre-wrap font-sans">
                  {msg.content}
                  {msg.isStreaming && (
                    <span className="inline-block w-2 h-4 ml-1 bg-blue-500 animate-pulse align-middle" />
                  )}
                </div>

                {/* Artifacts attached to this message */}
                {msg.artifacts && msg.artifacts.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-slate-100 dark:border-slate-800 pt-2">
                    {msg.artifacts.map((art) => (
                      <ArtifactCard key={art.id} artifact={art} />
                    ))}
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Real-time Activity Panel during active agent runs */}
      {activeEvents.length > 0 && (
        <ActivityPanel events={activeEvents} isRunning={isStreaming} />
      )}

      {/* Active in-flight artifacts */}
      {activeArtifacts.length > 0 && (
        <div className="max-w-3xl mx-auto w-full px-4 space-y-2">
          {activeArtifacts.map((art) => (
            <ArtifactCard key={art.id} artifact={art} />
          ))}
        </div>
      )}

      {error && (
        <div className="max-w-3xl mx-auto p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-start gap-3 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-xs uppercase tracking-wider mb-0.5">Execution Error</div>
            <div>{error}</div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
