'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ApprovalDialogProps {
  isOpen: boolean;
  actionTitle: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ApprovalDialog({
  isOpen,
  actionTitle,
  description,
  onConfirm,
  onCancel,
}: ApprovalDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {actionTitle === 'Final submission' ? 'FINAL SUBMISSION' : 'Confirmation Required'}
            </h3>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {actionTitle}
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-[#141e33] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
          {description}
        </p>

        <div className="flex justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition shadow-xs"
          >
            {actionTitle === 'Final submission' ? 'Submit' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  );
}
