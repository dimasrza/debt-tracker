'use client';
import { useMemo } from 'react';
import { useData } from '@/lib/store';
import { dateID, rupiah } from '@/lib/format';
import { Card, Empty, PageHeader } from '@/components/ui';

const KIND = { full: 'Cicilan penuh', partial: 'Sebagian', early_payoff: 'Pelunasan dipercepat' } as const;

export default function Payments() {
  const { data, undoPayment } = useData();
  const rows = useMemo(() => [...data.payments].sort((a, b) => b.date.localeCompare(a.date)), [data.payments]);
  const name = (id: string) => data.debts.find((d) => d.id === id)?.name ?? '(utang dihapus)';
  const split = (id: string) => {
    const a = data.paymentAllocations.filter((x) => x.paymentId === id);
    return { pokok: a.reduce((s, x) => s + x.principal, 0), bunga: a.reduce((s, x) => s + x.interest, 0), biaya: a.reduce((s, x) => s + x.fee, 0), denda: a.reduce((s, x) => s + x.penalty, 0) };
  };
  return (
    <>
      <PageHeader title="Riwayat Pembayaran" sub={rows.length ? `${rows.length} transaksi, total ${rupiah(rows.reduce((a, p) => a + p.amount, 0))}` : undefined} />
      {rows.length === 0 ? <Empty title="Belum ada pembayaran" hint="Catat pembayaran dari halaman detail utang." /> : (
        <Card>
          <ul className="divide-y divide-teal-50">
            {rows.map((p) => {
              const s = split(p.id);
              return (
                <li key={p.id} className="py-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="truncate font-medium">{name(p.debtId)}</p><p className="text-xs text-teal-900/70">{dateID(p.date)} · {KIND[p.kind]}{p.note ? ` · ${p.note}` : ''}</p></div>
                    <strong className="shrink-0">{rupiah(p.amount)}</strong>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-xs text-teal-900/70">
                    <span>Pokok {rupiah(s.pokok)} · Bunga {rupiah(s.bunga)}{s.biaya ? ` · Biaya ${rupiah(s.biaya)}` : ''}{s.denda ? ` · Denda ${rupiah(s.denda)}` : ''}</span>
                    <button className="shrink-0 text-rose-700 underline" onClick={() => { if (window.confirm('Batalkan pembayaran ini?')) void undoPayment(p.id); }}>Batalkan</button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
