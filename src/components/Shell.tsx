'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { DataProvider, useData } from '@/lib/store';
import { Btn, Card, Notice, cx } from './ui';

const NAV = [
  { href: '/', label: 'Dashboard', short: 'Beranda', icon: '◧' },
  { href: '/debts/', label: 'Daftar Utang', short: 'Utang', icon: '☰' },
  { href: '/schedule/', label: 'Jadwal Cicilan', short: 'Jadwal', icon: '▤' },
  { href: '/payments/', label: 'Riwayat Pembayaran', short: 'Riwayat', icon: '✓' },
  { href: '/analysis/', label: 'Analisis Utang', short: 'Analisis', icon: '◔' },
  { href: '/planner/', label: 'Debt-Free Planner', short: 'Planner', icon: '⚑' },
  { href: '/reports/', label: 'Laporan', short: 'Laporan', icon: '⇩' },
  { href: '/settings/', label: 'Pengaturan dan Backup', short: 'Pengaturan', icon: '⚙' },
] as const;
const MOBILE_MAIN = ['/', '/debts/', '/schedule/', '/payments/'];

const norm = (p: string) => (p === '/' ? '/' : p.replace(/\/?$/, '/'));

function Gate({ children }: { children: ReactNode }) {
  const { status, error, reload, enterDemo } = useData();
  const path = norm(usePathname() ?? '/');
  if (path === '/settings/' || status === 'ready') return <>{children}</>;
  if (status === 'loading') return <p className="py-20 text-center text-teal-900/70" aria-live="polite">Memuat data dari Google Sheet…</p>;
  if (status === 'noconfig')
    return (
      <Card className="mx-auto mt-10 max-w-md text-center">
        <h1 className="text-xl font-semibold">Hubungkan Google Sheet</h1>
        <p className="mt-2 text-sm text-teal-900/70">Masukkan URL Apps Script dan kunci API sekali di Pengaturan. Data tersimpan di Sheet Anda.</p>
        <div className="mt-5 flex flex-col gap-2">
          <Link href="/settings/" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-700 px-4 text-sm font-medium text-white">Buka Pengaturan</Link>
          <Btn variant="ghost" onClick={enterDemo}>Coba dengan data demo</Btn>
        </div>
      </Card>
    );
  return (
    <div className="mx-auto mt-10 max-w-md space-y-3">
      <Notice tone="error">{error}</Notice>
      <div className="flex gap-2">
        <Btn onClick={() => void reload()}>Coba lagi</Btn>
        <Link href="/settings/" className="inline-flex min-h-11 items-center rounded-xl border border-teal-200 px-4 text-sm">Periksa pengaturan</Link>
      </div>
    </div>
  );
}

function Chrome({ children }: { children: ReactNode }) {
  const path = norm(usePathname() ?? '/');
  const { demo, exitDemo, status, data } = useData();
  const [more, setMore] = useState(false);
  const last = data.settings.lastBackupAt;
  const stale = !demo && status === 'ready' && data.debts.length > 0 && (!last || Date.now() - new Date(last).getTime() > 30 * 86400_000);
  const active = (href: string) => path === href;
  return (
    <div className="min-h-dvh md:flex">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-teal-100 bg-white p-4 md:flex">
        <div className="mb-6 px-2 text-lg font-semibold text-teal-800">Debt Tracker</div>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={active(n.href) ? 'page' : undefined}
              className={cx('flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm', active(n.href) ? 'bg-teal-700 text-white' : 'text-teal-900 hover:bg-teal-50')}>
              <span aria-hidden className="w-5 text-center">{n.icon}</span>{n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-8 md:py-8">
        <div className="mx-auto max-w-5xl space-y-4">
          {demo && (
            <Notice tone="warn">
              <div className="flex items-center justify-between gap-3">
                <span>Mode demo: data contoh hanya ada di layar ini dan tidak disimpan ke Sheet.</span>
                <button onClick={exitDemo} className="shrink-0 font-medium underline">Keluar</button>
              </div>
            </Notice>
          )}
          {stale && (
            <Notice tone="warn">
              {last ? 'Backup terakhir lebih dari 30 hari lalu. ' : 'Data belum pernah dibackup. '}
              <Link href="/settings/" className="font-medium underline">Buat backup JSON</Link>
            </Notice>
          )}
          <Gate>{children}</Gate>
        </div>
      </main>
      <nav aria-label="Navigasi utama" className="fixed inset-x-0 bottom-0 z-40 border-t border-teal-100 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="grid grid-cols-5">
          {NAV.filter((n) => MOBILE_MAIN.includes(n.href)).map((n) => (
            <li key={n.href}>
              <Link href={n.href} aria-current={active(n.href) ? 'page' : undefined} className={cx('flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs', active(n.href) ? 'font-semibold text-teal-700' : 'text-teal-900/70')}>
                <span aria-hidden className="text-base">{n.icon}</span>{n.short}
              </Link>
            </li>
          ))}
          <li>
            <button onClick={() => setMore((v) => !v)} aria-expanded={more} className={cx('flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-xs', !MOBILE_MAIN.includes(path) ? 'font-semibold text-teal-700' : 'text-teal-900/70')}>
              <span aria-hidden className="text-base">⋯</span>Lainnya
            </button>
          </li>
        </ul>
        {more && (
          <div className="absolute inset-x-3 bottom-[calc(100%+0.5rem)] rounded-2xl border border-teal-100 bg-white p-2">
            {NAV.filter((n) => !MOBILE_MAIN.includes(n.href)).map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setMore(false)} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm hover:bg-teal-50">
                <span aria-hidden className="w-5 text-center">{n.icon}</span>{n.label}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <DataProvider>
      <Chrome>{children}</Chrome>
    </DataProvider>
  );
}
