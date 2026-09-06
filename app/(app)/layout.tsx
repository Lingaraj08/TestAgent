'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { PanelLeft } from 'lucide-react';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-[#090d16]">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile top bar to toggle sidebar */}
        <div className="md:hidden flex items-center px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1322]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
          <span className="ml-3 font-semibold text-slate-800 dark:text-slate-100">Nexus</span>
        </div>

        <main className="flex-1 overflow-hidden relative flex flex-col">
          {children}
        </main>
      </div>
    </div>
  );
}
