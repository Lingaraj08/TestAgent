'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/components/theme-provider';
import { groupByDate } from '@/lib/utils';
import type { Conversation } from '@/types/database';
import {
  MessageSquarePlus,
  MessageSquare,
  Files,
  CheckSquare,
  Cpu,
  Settings,
  Brain,
  LogOut,
  Moon,
  Sun,
  Trash2,
  Bot,
  PanelLeftClose,
} from 'lucide-react';

export function Sidebar({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { resolvedTheme, setTheme } = useTheme();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (e) {
      console.error('Failed to load conversations:', e);
    } finally {
      setLoadingConvs(false);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserEmail(user.email || null);
    });

    fetchConversations();

    // Listen for custom conversation refresh events
    const handleRefresh = () => fetchConversations();
    window.addEventListener('refresh-conversations', handleRefresh);
    return () => window.removeEventListener('refresh-conversations', handleRefresh);
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this conversation?')) return;

    try {
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (pathname === `/chat/${id}`) {
          router.push('/chat');
        }
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const navLinks = [
    { href: '/files', label: 'Files', icon: Files },
    { href: '/tasks', label: 'Tasks', icon: CheckSquare },
    { href: '/models', label: 'Models', icon: Cpu },
    { href: '/settings', label: 'Settings', icon: Settings },
    { href: '/memory', label: 'Memory', icon: Brain },
  ];

  const grouped = groupByDate(conversations);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col w-64 bg-white dark:bg-[#0d1322] border-r border-slate-200 dark:border-slate-800/80 transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Header / Brand */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800/80">
          <Link href="/chat" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">Nexus</span>
          </Link>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
            title="Close sidebar"
          >
            <PanelLeftClose className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <Link
            href="/chat"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-sm transition shadow-blue-500/10"
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span>New Chat</span>
          </Link>
        </div>

        {/* Conversations History */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          {loadingConvs ? (
            <div className="text-xs text-slate-400 p-2 text-center animate-pulse">Loading chats...</div>
          ) : conversations.length === 0 ? (
            <div className="text-xs text-slate-400 p-4 text-center">No chats yet. Start a new one!</div>
          ) : (
            grouped.map((group) => (
              <div key={group.label} className="space-y-1">
                <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase px-2 py-1 tracking-wider">
                  {group.label}
                </div>
                {group.items.map((conv) => {
                  const isActive = pathname === `/chat/${conv.id}`;
                  return (
                    <Link
                      key={conv.id}
                      href={`/chat/${conv.id}`}
                      className={`group flex items-center justify-between px-2.5 py-2 rounded-lg text-sm transition ${
                        isActive
                          ? 'bg-slate-100 dark:bg-[#141e33] text-blue-600 dark:text-blue-400 font-medium'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/60 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <MessageSquare className="w-4 h-4 shrink-0 opacity-70" />
                        <span className="truncate">{conv.title}</span>
                      </div>

                      <button
                        onClick={(e) => handleDeleteConversation(e, conv.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 text-slate-400 transition"
                        title="Delete chat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </Link>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Workspace Nav Links */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 space-y-0.5">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
                  isActive
                    ? 'bg-slate-100 dark:bg-[#141e33] text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/60 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4 opacity-70" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Footer: User Profile, Theme & Logout */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="truncate max-w-[120px] font-medium" title={userEmail || ''}>
            {userEmail || 'User'}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Toggle dark/light theme"
            >
              {resolvedTheme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 transition"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
