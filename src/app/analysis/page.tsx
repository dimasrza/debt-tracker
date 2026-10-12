'use client';
import { useMemo } from 'react';
import { useData } from '@/lib/store';
import { analysis } from '@/lib/stats';
import { rupiah, typeLabel } from '@/lib/format';
import { Card, Empty, PageHeader } from '@/components/ui';

export default function Analysis() {
  const { data } = useData();
  const a = useMemo(() => analysis(data), [data]);
  const types = Object.entries(a.byType).filter(([, v]) => v > 0).sort((x, y) => y[1] - x[1]);
  const total = a.principalLeft + a.interestLeft;
  const costly = useMemo(() => [...data.debts].filter((d) => d.status === 'active').sort((x, y) => y.annualRatePct - x.annualRatePct), [data.debts]);
  if (data.debts.length === 0) return (<><PageHeader title="Analisis Utang" /><Empty title="Belum ada data untuk dianalisis" /></>);
  return (
    <>
      <PageHeader title="Analisis Utang" />
      <Card>
        <h2 className="font-semibold">Sisa yang harus dibayar</h2>
        <div className="mt-3 flex h-4 overflow-hidden rounded-full bg-teal-100" role="img" aria-label="Perbandingan sisa pokok dan bunga">
          <div className="bg-teal-700" style={{ width: `${total ? (a.principalLeft / total) * 100 : 0}%` }} />
          <div className="bg-amber-400" style={{ width: `${total ? (a.interestLeft / total) * 100 : 0}%` }} />
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div><dt className="flex items-center gap-2 text-xs text-teal-900/70"><span className="size-2 rounded-full bg-teal-700" />Pokok</dt><dd className="font-semibold">{rupiah(a.principalLeft)}</dd></div>
          <div><dt className="flex items-center gap-2 text-xs text-teal-900/70"><span className="size-2 rounded-full bg-amber-400" />Bunga terjadwal</dt><dd className="font-semibold">{rupiah(a.interestLeft)}</dd></div>
        </dl>
        <p className="mt-3 text-sm text-teal-900/80">Rata-rata bunga tertimbang sisa pokok: <strong>{a.avgRate.toFixed(1)}% per tahun</strong>.</p>
      </Card>
      <Card>
        <h2 className="mb-3 font-semibold">Sisa pokok per jenis</h2>
        {types.length === 0 ? <p className="text-sm text-teal-900/70">Semua utang sudah lunas.</p> : (
          <ul className="space-y-3">
            {types.map(([t, v]) => (
              <li key={t}>
                <div className="mb-1 flex justify-between text-sm"><span>{typeLabel(t)}</span><span className="font-medium">{rupiah(v)}</span></div>
                <div className="h-2.5 rounded-full bg-teal-100"><div className="h-full rounded-full bg-teal-600" style={{ width: `${(v / a.principalLeft) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <h2 className="mb-3 font-semibold">Utang aktif dari bunga tertinggi</h2>
        <ul className="divide-y divide-teal-50 text-sm">
          {costly.map((d) => (<li key={d.id} className="flex min-h-11 items-center justify-between gap-3"><span className="truncate">{d.name}</span><span className="shrink-0 font-semibold">{d.annualRatePct}%</span></li>))}
        </ul>
        <p className="mt-2 text-xs text-teal-900/70">Bunga flat tampak lebih rendah dari bunga efektifnya karena dihitung dari pokok awal.</p>
      </Card>
    </>
  );
}
