'use client';
import { useEffect } from 'react';
import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes } from 'react';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cx('rounded-card border border-teal-100 bg-white p-4 sm:p-5', className)}>{children}</section>;
}

export function Btn({ variant = 'primary', className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  const v = {
    primary: 'bg-teal-700 text-white hover:bg-teal-800 disabled:bg-teal-300',
    ghost: 'border border-teal-200 bg-white text-teal-800 hover:bg-teal-50 disabled:opacity-50',
    danger: 'border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 disabled:opacity-50',
  }[variant];
  return <button {...p} className={cx('inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-medium transition-colors', v, className)} />;
}

export function PageHeader({ title, action, sub }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <header className="mb-5 flex items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {sub && <p className="mt-1 text-sm text-teal-900/70">{sub}</p>}
      </div>
      {action}
    </header>
  );
}

export function Progress({ value, tone = 'teal' }: { value: number; tone?: 'teal' | 'light' }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className={cx('h-2.5 w-full overflow-hidden rounded-full', tone === 'light' ? 'bg-white/20' : 'bg-teal-100')}>
      <div className={cx('h-full rounded-full transition-[width] duration-500', tone === 'light' ? 'bg-white' : 'bg-teal-600')} style={{ width: `${pct}%` }} />
    </div>
  );
}

const BADGE = {
  paid: 'bg-teal-100 text-teal-800',
  upcoming: 'bg-slate-100 text-slate-700',
  partial: 'bg-amber-100 text-amber-800',
  overdue: 'bg-rose-100 text-rose-700',
  active: 'bg-teal-50 text-teal-800',
} as const;
const BADGE_LABEL = { paid: 'Lunas', upcoming: 'Akan datang', partial: 'Sebagian', overdue: 'Terlambat', active: 'Aktif' } as const;
export function Badge({ kind }: { kind: keyof typeof BADGE }) {
  return <span className={cx('inline-block rounded-full px-2.5 py-0.5 text-xs font-medium', BADGE[kind])}>{BADGE_LABEL[kind]}</span>;
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-teal-200 bg-white/60 p-8 text-center">
      <p className="font-medium">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-sm text-sm text-teal-900/70">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'error'; children: ReactNode }) {
  const t = { info: 'bg-teal-50 text-teal-900 border-teal-200', warn: 'bg-amber-50 text-amber-900 border-amber-200', error: 'bg-rose-50 text-rose-800 border-rose-200' }[tone];
  return <div role={tone === 'error' ? 'alert' : undefined} className={cx('rounded-xl border px-4 py-3 text-sm', t)}>{children}</div>;
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Tutup" className="grid size-10 place-items-center rounded-full hover:bg-teal-50">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-teal-900/60">{hint}</span>}
    </label>
  );
}
const inputCls = 'min-h-11 w-full rounded-xl border border-teal-200 bg-white px-3 text-base sm:text-sm';
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cx(inputCls, p.className)} />;
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cx(inputCls, p.className)} />;

export function MoneyInput({ value, onChange, ...rest }: { value: number; onChange: (n: number) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <Input
      {...rest}
      inputMode="numeric"
      value={value ? new Intl.NumberFormat('id-ID').format(value) : ''}
      placeholder="0"
      onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, '')) || 0)}
    />
  );
}
