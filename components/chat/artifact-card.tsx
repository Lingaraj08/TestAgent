'use client';

import React from 'react';
import {
  FileSpreadsheet,
  FileText,
  Presentation,
  Download,
  File,
} from 'lucide-react';
import type { ToolArtifact } from '@/types/tools';

interface ArtifactCardProps {
  artifact: ToolArtifact;
}

export function ArtifactCard({ artifact }: ArtifactCardProps) {
  const getIcon = () => {
    switch (artifact.type) {
      case 'excel':
        return <FileSpreadsheet className="w-6 h-6 text-emerald-500" />;
      case 'word':
        return <FileText className="w-6 h-6 text-blue-500" />;
      case 'pdf':
        return <FileText className="w-6 h-6 text-red-500" />;
      case 'powerpoint':
        return <Presentation className="w-6 h-6 text-amber-500" />;
      default:
        return <File className="w-6 h-6 text-slate-500" />;
    }
  };

  const getBadgeColor = () => {
    switch (artifact.type) {
      case 'excel':
        return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'word':
        return 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'pdf':
        return 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'powerpoint':
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const downloadUrl = artifact.downloadUrl || (artifact.storagePath ? `/api/files/download?path=${encodeURIComponent(artifact.storagePath)}` : `/api/files/download?id=${encodeURIComponent(artifact.id)}`);

  return (
    <div className="flex items-center justify-between p-3.5 my-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] shadow-xs max-w-md w-full">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-[#141e33] flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-800">
          {getIcon()}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
            {artifact.filename}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border uppercase tracking-wider ${getBadgeColor()}`}>
              {artifact.type || artifact.fileType || 'file'}
            </span>
            <span className="text-xs text-slate-400">
              {(artifact.sizeBytes / 1024).toFixed(1)} KB
            </span>
          </div>
        </div>
      </div>

      <a
        href={downloadUrl}
        download={artifact.filename}
        className="flex items-center gap-1.5 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition shadow-xs shrink-0 ml-3"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Download</span>
      </a>
    </div>
  );
}
