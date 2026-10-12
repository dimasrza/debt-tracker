'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useData } from '@/lib/store';
import { dateID, monthID, rupiah, todayISO } from '@/lib/format';
import { installmentStatus, outstandingTotal } from '@/lib/calc/payments';
import { Badge, Card, Empty, PageHeader } from '@/components/ui';

export default function Schedule() {
  const { data } = useData();
  const today = todayISO();
  const [f, setF] = useState<'open' | 'overdue' | 'month'>('open');
  const groups = useMemo(() => {
    const rows = data.installments
      .filter((i) => outstandingTotal(i) > 0)
      .filter((i) => (f === 'overdue' ? i.dueDate < today : f === 'month' ? i.dueDate.slice(0, 7) === today.slice(0, 7) : true))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const m = new Map<string, typeof rows>();
    for (const r of rows) m.set(r.dueDate.slice(0, 7), [...(m.get(r.dueDate.slice(0, 7)) ?? []), r]);
    return [...m.entries()];
  }, [data.installments, f, today]);
  const name = (id: string) => data.debts.find((d) => d.id === id)?.name ?? '-';

  return (
    <>
      <PageHeader title="Jadwal Cicilan" sub="Semua cicilan yang belum lunas dari seluruh utang." />
      <div className="flex gap-2">
        {([['open', 'Belum lunas'], ['month', 'Bulan ini'], ['overdue', 'Terlambat']] as const).map(([k, l]) => (
          <button key={k} aria-pressed={f === k} onClick={() => setF(k)} className={`min-h-10 rounded-full px-4 text-sm ${f === k ? 'bg-teal-700 text-white' : 'border border-teal-200 bg-white'}`}>{l}</button>
        ))}
      </div>
      {groups.length === 0 ? <Empty title="Tidak ada cicilan di filter ini" /> : groups.map(([month, rows]) => (
        <Card key={month}>
          <div className="mb-2 flex items-baseline justify-between"><h2 className="font-semibold">{monthID(`${month}-01`)}</h2><span className="text-sm text-teal-900/70">{rupiah(rows.reduce((a, r) => a + outstandingTotal(r), 0))}</span></div>
          <ul className="divide-y divide-teal-50">
            {rows.map((i) => (
              <li key={i.id}>
                <Link href={`/debts/detail/?id=${i.debtId}`} className="flex min-h-12 items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0"><span className="block truncate font-medium">{name(i.debtId)}</span><span className="text-xs text-teal-900/70">Cicilan {i.number} · {dateID(i.dueDate)}</span></span>
                  <span className="flex shrink-0 items-center gap-2"><Badge kind={installmentStatus(i, today)} /><strong>{rupiah(outstandingTotal(i))}</strong></span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </>
  );
}
