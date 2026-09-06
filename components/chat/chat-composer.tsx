'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ModelSelector } from './model-selector';
import {
  ArrowUp,
  Paperclip,
  Square,
  X,
  FileText,
  Loader2,
  MessageSquare,
  Search,
  Compass,
  Bot,
} from 'lucide-react';

export type WorkspaceMode = 'chat' | 'search' | 'deep_research' | 'agent';

interface ChatComposerProps {
  onSendMessage: (content: string, attachments: any[], mode: WorkspaceMode) => void;
  onStop: () => void;
  isStreaming: boolean;
  selectedMode: 'auto' | 'manual';
  selectedModelId: string | null;
  onModelSelect: (mode: 'auto' | 'manual', modelId: string | null) => void;
  activeModelName?: string;
  conversationId?: string | null;
  mode?: WorkspaceMode;
  onModeChange?: (mode: WorkspaceMode) => void;
}

export function ChatComposer({
  onSendMessage,
  onStop,
  isStreaming,
  selectedMode,
  selectedModelId,
  onModelSelect,
  activeModelName,
  conversationId,
  mode = 'agent',
  onModeChange,
}: ChatComposerProps) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [activeMode, setActiveMode] = useState<WorkspaceMode>(mode);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync mode if changed externally
  useEffect(() => {
    setActiveMode(mode);
  }, [mode]);

  useEffect(() => { setInput(localStorage.getItem('nexus-chat-draft') || ''); }, []);
  useEffect(() => { localStorage.setItem('nexus-chat-draft', input); }, [input]);

  // Auto-resize textarea as content grows
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleModeSelect = (newMode: WorkspaceMode) => {
    setActiveMode(newMode);
    onModeChange?.(newMode);
  };

  const handleSubmit = () => {
    if ((!input.trim() && attachments.length === 0) || isStreaming || uploading) return;
    onSendMessage(input.trim(), attachments, activeMode);
    setInput('');
    localStorage.removeItem('nexus-chat-draft');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);
      if (conversationId) {
        formData.append('conversationId', conversationId);
      }

      try {
        const res = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          setAttachments((prev) => [...prev, data.file]);
        } else {
          const err = await res.json();
          alert(`Failed to upload ${file.name}: ${err.error || 'Unknown error'}`);
        }
      } catch (err) {
        console.error('File upload failed:', err);
        alert(`Failed to upload ${file.name}`);
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const modes: { id: WorkspaceMode; label: string; icon: any }[] = [
    { id: 'agent', label: 'Agent', icon: Bot },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'deep_research', label: 'Deep Research', icon: Compass },
  ];

  return (
    <div className="p-4 max-w-3xl w-full mx-auto">
      {/* Mode Selector pills above composer */}
      <div className="flex items-center gap-1.5 mb-2.5 overflow-x-auto pb-1">
        {modes.map((m) => {
          const Icon = m.icon;
          const isSelected = activeMode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => handleModeSelect(m.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition shrink-0 ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-[#0f172a] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((file, idx) => (
            <div
              key={file.id || idx}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#141e33] border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300"
            >
              <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="truncate max-w-[150px]">{file.filename}</span>
              <button
                type="button"
                onClick={() => removeAttachment(idx)}
                className="hover:text-red-500 text-slate-400 ml-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Composer Box */}
      <div className="relative rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800/90 shadow-lg focus-within:ring-2 focus-within:ring-blue-500/50 transition p-2.5">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            activeMode === 'agent'
              ? 'Ask Nexus to analyze, search, execute Python, or generate documents...'
              : activeMode === 'search'
              ? 'Ask anything to search the live web with citations...'
              : 'Message Nexus...'
          }
          rows={1}
          className="w-full resize-none bg-transparent px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none max-h-48"
        />

        {/* Action bar inside composer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 mt-1 px-1">
          <div className="flex items-center gap-1.5">
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              className="hidden"
            />

            {/* Attach button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition"
              title="Attach files (TXT, CSV, PDF, DOCX, XLSX, images)"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              ) : (
                <Paperclip className="w-4 h-4" />
              )}
            </button>

            {/* Model Selector */}
            <ModelSelector
              selectedMode={selectedMode}
              selectedModelId={selectedModelId}
              onSelect={onModelSelect}
              activeModelName={activeModelName}
            />
          </div>

          <div>
            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center hover:opacity-80 transition shadow-sm"
                title="Stop generation"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={(!input.trim() && attachments.length === 0) || uploading}
                className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition disabled:opacity-30 shadow-sm"
                title="Send message (Enter)"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="text-[11px] text-center text-slate-400 dark:text-slate-500 mt-2">
        Nexus {activeMode === 'agent' ? 'Autonomous Agent' : 'Workspace'} • Protected isolated sandbox execution
      </div>
    </div>
  );
}
