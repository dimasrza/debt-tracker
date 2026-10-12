'use client';
import Link from 'next/link';
import { useMemo } from 'react';
import { useData } from '@/lib/store';
import { dashboardStats, monthlyProjection } from '@/lib/stats';
import { outstandingTotal } from '@/lib/calc/payments';
import { dateID, monthID, rupiah, todayISO } from '@/lib/format';
import { Card, Empty, PageHeader, Progress } from '@/components/ui';

export default function Dashboard() {
  const { data } = useData();
  const today = todayISO();
  const s = useMemo(() => dashboardStats(data, today), [data, today]);
  const proj = useMemo(() => monthlyProjection(data, today, 6), [data, today]);
  const name = (id: string) => data.debts.find((d) => d.id === id)?.name ?? '-';
  const max = Math.max(1, ...proj.map((p) => p.amount));

  if (data.debts.length === 0)
    return (
      <>
        <PageHeader title="Dashboard" />
        <Empty title="Belum ada utang tercatat" hint="Tambahkan utang pertama Anda untuk melihat sisa pokok, jadwal cicilan, dan perkiraan bebas utang." action={<Link href="/debts/" className="inline-flex min-h-11 items-center rounded-xl bg-teal-700 px-4 text-sm font-medium text-white">Tambah utang</Link>} />
      </>
    );

  return (
    <>
      <PageHeader title="Dashboard" />
      <section className="rounded-3xl bg-teal-700 p-5 text-white sm:p-7">
        <p className="text-sm text-teal-100">Sisa pokok</p>
        <p className="mt-1 text-4xl font-semibold tracking-tight sm:text-5xl">{rupiah(s.remainingPrincipal)}</p>
        <div className="mt-5"><Progress value={s.progress} tone="light" /></div>
        <div className="mt-2 flex justify-between text-sm text-teal-50">
          <span>{Math.round(s.progress * 100)}% pokok sudah terbayar</span>
          <span>{s.freeDate ? `Bebas utang ${monthID(s.freeDate)}` : 'Semua utang lunas'}</span>
        </div>
      </section>

      <Card>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-5">
          {[
            ['Total utang awal', rupiah(s.initial)],
            ['Sisa kewajiban', rupiah(s.remainingObligation)],
            ['Total dibayar', rupiah(s.totalPaid)],
            ['Utang aktif / lunas', `${s.activeCount} / ${s.paidCount}`],
          ].map(([k, v]) => (
            <div key={k}><dt className="text-xs text-teal-900/70">{k}</dt><dd className="mt-0.5 font-semibold">{v}</dd></div>
          ))}
          <div><dt className="text-xs text-teal-900/70">Tunggakan</dt><dd className={`mt-0.5 font-semibold ${s.overdueCount ? 'text-rose-700' : ''}`}>{s.overdueCount ? `${rupiah(s.overdueAmount)} (${s.overdueCount} cicilan)` : 'Tidak ada'}</dd></div>
        </dl>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">Cicilan mendatang</h2>
          {s.upcoming.length === 0 ? <p className="text-sm text-teal-900/70">Tidak ada cicilan yang akan jatuh tempo.</p> : (
            <ul className="divide-y divide-teal-50">
              {s.upcoming.map((i) => (
                <li key={i.id}>
                  <Link href={`/debts/detail/?id=${i.debtId}`} className="flex min-h-12 items-center justify-between gap-3 py-2">
                    <span className="min-w-0"><span className="block truncate text-sm font-medium">{name(i.debtId)}</span><span className="text-xs text-teal-900/70">Cicilan {i.number} · {dateID(i.dueDate)}</span></span>
                    <span className="shrink-0 text-sm font-semibold">{rupiah(outstandingTotal(i))}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Kewajiban 6 bulan ke depan</h2>
          <div className="flex h-36 items-end gap-2" role="img" aria-label="Grafik kewajiban per bulan">
            {proj.map((p) => (
              <div key={p.month} className="flex flex-1 flex-col items-center justify-end gap-1">
                <div className="w-full rounded-t-lg bg-teal-600" style={{ height: `${Math.max(2, (p.amount / max) * 100)}%` }} title={`${monthID(`${p.month}-01`)}: ${rupiah(p.amount)}`} />
                <span className="text-[11px] text-teal-900/70">{new Date(`${p.month}-01T00:00:00`).toLocaleDateString('id-ID', { month: 'short' })}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-teal-900/70">Bulan ini: {rupiah(proj[0]?.amount ?? 0)}, termasuk tunggakan.</p>
        </Card>
      </div>

      {s.overdue.length > 0 && (
        <Card className="border-rose-200">
          <h2 className="mb-3 font-semibold text-rose-700">Tunggakan</h2>
          <ul className="divide-y divide-rose-50">
            {s.overdue.map((i) => (
              <li key={i.id}>
                <Link href={`/debts/detail/?id=${i.debtId}`} className="flex min-h-12 items-center justify-between gap-3 py-2 text-sm">
                  <span className="truncate">{name(i.debtId)} · cicilan {i.number} · {dateID(i.dueDate)}</span>
                  <span className="shrink-0 font-semibold text-rose-700">{rupiah(outstandingTotal(i))}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
