'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useData } from '@/lib/store';
import { rupiah, todayISO, typeLabel } from '@/lib/format';
import { summarize } from '@/lib/calc/payments';
import { Badge, Btn, Card, Empty, Modal, PageHeader, Progress } from '@/components/ui';
import { DebtForm } from '@/components/DebtForm';

export default function Debts() {
  const { data } = useData();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'active' | 'paid' | 'all'>('active');
  const today = todayISO();
  const rows = useMemo(
    () => data.debts.filter((d) => tab === 'all' || d.status === tab).map((d) => ({ d, s: summarize(data.installments.filter((i) => i.debtId === d.id), today) })),
    [data, tab, today],
  );
  return (
    <>
      <PageHeader title="Daftar Utang" action={<Btn onClick={() => setOpen(true)}>Tambah utang</Btn>} />
      <div className="flex gap-2">
        {(['active', 'paid', 'all'] as const).map((t) => (
          <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)} className={`min-h-10 rounded-full px-4 text-sm ${tab === t ? 'bg-teal-700 text-white' : 'border border-teal-200 bg-white'}`}>{{ active: 'Aktif', paid: 'Lunas', all: 'Semua' }[t]}</button>
        ))}
      </div>
      {rows.length === 0 ? (
        <Empty title={data.debts.length ? 'Tidak ada utang di filter ini' : 'Belum ada utang'} hint="Tambahkan utang beserta tenor dan bunganya. Jadwal cicilan dibuat otomatis." action={<Btn onClick={() => setOpen(true)}>Tambah utang</Btn>} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {rows.map(({ d, s }) => (
            <li key={d.id}>
              <Link href={`/debts/detail/?id=${d.id}`} className="block">
                <Card className="transition-colors hover:border-teal-300">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><p className="truncate font-semibold">{d.name}</p><p className="text-xs text-teal-900/70">{typeLabel(d.type)}{d.lender ? ` · ${d.lender}` : ''} · {d.annualRatePct}%/thn</p></div>
                    <Badge kind={s.overdueCount ? 'overdue' : d.status === 'paid' ? 'paid' : 'active'} />
                  </div>
                  <p className="mt-3 text-lg font-semibold">{rupiah(s.remainingPrincipal)} <span className="text-xs font-normal text-teal-900/70">sisa pokok dari {rupiah(d.principal)}</span></p>
                  <div className="mt-2"><Progress value={1 - s.remainingPrincipal / d.principal} /></div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {open && <Modal title="Tambah utang" onClose={() => setOpen(false)}><DebtForm onDone={() => setOpen(false)} /></Modal>}
    </>
  );
}
