'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useActiveLeague, useApp } from '@/state/store';
import { cx } from './ui/primitives';

const NAV = [
  { href: '/', label: 'Leagues' },
  { href: '/setup/', label: 'Setup' },
  { href: '/data/', label: 'Data' },
  { href: '/draft/', label: 'Draft' },
  { href: '/review/', label: 'Review / Debug' },
  { href: '/settings/', label: 'Settings' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const init = useApp((s) => s.init);
  const status = useApp((s) => s.status);
  const error = useApp((s) => s.error);
  const theme = useApp((s) => s.settings.theme);
  const saveStatus = useApp((s) => s.saveStatus);
  const storage = useApp((s) => s.storage);
  const leagues = useApp((s) => s.leagues);
  const setActive = useApp((s) => s.setActiveLeague);
  const message = useApp((s) => s.lastMessage);
  const notify = useApp((s) => s.notify);
  const active = useActiveLeague();
  const path = usePathname();

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', dark);
    };
    apply();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => notify(null), 5000);
    return () => clearTimeout(t);
  }, [message, notify]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-30 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-200 bg-slate-900 px-3 py-1.5 text-slate-100 dark:border-slate-800">
        <span className="text-sm font-bold tracking-tight">9-Cat Draft Engine</span>
        <nav className="flex flex-wrap gap-0.5" aria-label="Main">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cx(
                'rounded px-2 py-1 text-xs font-medium',
                (n.href === '/' ? path === '/' : path?.startsWith(n.href.replace(/\/$/, ''))) ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800',
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 text-xs">
          {leagues.length > 0 && (
            <label className="flex items-center gap-1">
              <span className="text-slate-400">League</span>
              <select
                aria-label="Active league"
                data-testid="league-switcher"
                className="rounded border border-slate-600 bg-slate-800 px-1 py-0.5 text-xs text-slate-100"
                value={active?.id ?? ''}
                onChange={(e) => setActive(e.target.value)}
              >
                {leagues.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} · {l.teamCount}T · #{l.draftPosition}
                  </option>
                ))}
              </select>
            </label>
          )}
          <span
            data-testid="save-status"
            title={storage === 'memory' ? 'IndexedDB unavailable — data is NOT persisted' : 'Stored locally in this browser (IndexedDB)'}
            className={cx(
              'rounded px-1.5 py-0.5 font-semibold',
              saveStatus === 'saved' && 'bg-emerald-700 text-white',
              saveStatus === 'saving' && 'bg-amber-600 text-white',
              saveStatus === 'error' && 'bg-red-600 text-white',
            )}
          >
            {saveStatus === 'saved' ? (storage === 'memory' ? 'Memory only' : 'Saved locally') : saveStatus === 'saving' ? 'Saving…' : 'Save error'}
          </span>
        </div>
      </header>
      {message && (
        <div role="status" className="border-b border-amber-300 bg-amber-50 px-3 py-1 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
          {message}
        </div>
      )}
      <main className="flex-1">
        {status === 'error' ? (
          <div className="p-6 text-sm text-red-700">Failed to open local storage: {error}</div>
        ) : status !== 'ready' ? (
          <div className="p-6 text-sm text-slate-500">Loading local data…</div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
