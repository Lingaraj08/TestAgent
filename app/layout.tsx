import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';
import { OfflineStatus } from '@/components/offline-status';

export const metadata: Metadata = {
  title: 'Nexus - Personal AI Workspace',
  description: 'Your intelligent multi-provider personal AI workspace',
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body className="h-full antialiased flex flex-col bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100">
        <ThemeProvider><OfflineStatus />{children}</ThemeProvider>
      </body>
    </html>
  );
}
