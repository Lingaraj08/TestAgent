'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Sparkles, ChevronDown, Check, PlusCircle, Brain, Eye, Wrench } from 'lucide-react';

interface ModelSelectorProps {
  selectedMode: 'auto' | 'manual';
  selectedModelId: string | null;
  onSelect: (mode: 'auto' | 'manual', modelId: string | null) => void;
  activeModelName?: string;
}

export function ModelSelector({
  selectedMode,
  selectedModelId,
  onSelect,
  activeModelName,
}: ModelSelectorProps) {
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/models')
      .then((res) => res.json())
      .then((data) => {
        setModels(data.models || []);
      })
      .catch((e) => console.error('Failed to load models:', e))
      .finally(() => setLoading(false));

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedModel = models.find((m) => m.id === selectedModelId);

  const displayLabel =
    selectedMode === 'auto'
      ? activeModelName
        ? `Auto (${activeModelName})`
        : 'Auto'
      : selectedModel?.display_name || 'Select Model';

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-[#141e33] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#1b2844] border border-slate-200 dark:border-slate-700/80 transition shadow-xs"
      >
        <Sparkles className="w-3.5 h-3.5 text-blue-500" />
        <span className="truncate max-w-[140px]">{displayLabel}</span>
        <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-0 w-72 max-h-80 overflow-y-auto rounded-xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xl z-50 p-1.5 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
            Model Routing
          </div>

          {/* Auto Option */}
          <button
            type="button"
            onClick={() => {
              onSelect('auto', null);
              setOpen(false);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition ${
              selectedMode === 'auto'
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <div className="text-left">
                <div>Auto Mode</div>
                <div className="text-[10px] text-slate-400 font-normal">Intelligently selects the best available model</div>
              </div>
            </div>
            {selectedMode === 'auto' && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
          </button>

          <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />

          <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
            Discovered Models ({models.length})
          </div>

          {loading ? (
            <div className="p-3 text-center text-xs text-slate-400">Loading models...</div>
          ) : models.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-400">
              No models discovered yet.
              <Link
                href="/models"
                onClick={() => setOpen(false)}
                className="block mt-1.5 text-blue-500 hover:underline font-medium"
              >
                Add AI Provider &rarr;
              </Link>
            </div>
          ) : (
            models.map((model) => {
              const isSelected = selectedMode === 'manual' && selectedModelId === model.id;
              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => {
                    onSelect('manual', model.id);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="text-left min-w-0 pr-2">
                    <div className="truncate font-medium">{model.display_name}</div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span>{model.provider_name}</span>
                      {model.supports_vision && <span title="Supports Vision"><Eye className="w-2.5 h-2.5" /></span>}
                      {model.supports_reasoning && <span title="Supports Reasoning"><Brain className="w-2.5 h-2.5 text-purple-400" /></span>}
                      {model.supports_tools && <span title="Supports Tools"><Wrench className="w-2.5 h-2.5 text-amber-400" /></span>}
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                </button>
              );
            })
          )}

          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-1">
            <Link
              href="/models"
              onClick={() => setOpen(false)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-500 transition rounded-lg"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Configure Providers & Models</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
