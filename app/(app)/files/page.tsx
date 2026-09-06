'use client';

import React, { useEffect, useState } from 'react';
import { Files, FileText, HardDrive } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import type { FileRecord } from '@/types/database';

export default function FilesPage() {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFiles = async () => {
    try {
      const res = await fetch('/api/files');
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch (e) {
      console.error('Failed to load files:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#090d16] p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Files className="w-6 h-6 text-blue-500" />
            <span>Files & Attachments</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Files uploaded during conversations are stored in private Supabase storage.
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400 animate-pulse">Loading files...</div>
        ) : files.length === 0 ? (
          <div className="p-12 rounded-2xl bg-white dark:bg-[#0f172a] border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-3">
            <HardDrive className="w-12 h-12 text-slate-400 mx-auto" />
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">No files uploaded yet</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Attach files in the chat composer to store and reference them during conversations.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {files.map((file) => (
                <div key={file.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {file.filename}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{(file.size_bytes / 1024).toFixed(1)} KB</span>
                        <span>•</span>
                        <span>{file.mime_type}</span>
                        <span>•</span>
                        <span>{formatRelativeTime(file.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
