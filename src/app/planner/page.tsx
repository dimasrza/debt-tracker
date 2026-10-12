'use client';
import { useMemo, useState } from 'react';
import { useData } from '@/lib/store';
import { planDebts, simulatePlan } from '@/lib/stats';
import { monthID, rupiah, todayISO } from '@/lib/format';
import { Card, Empty, Field, MoneyInput, Notice, PageHeader } from '@/components/ui';
import type { PlanResult } from '@/lib/calc/strategy';

export default function Planner() {
  const { data } = useData();
  const today = todayISO();
  const [extra, setExtra] = useState(0);
  const debts = useMemo(() => planDebts(data), [data]);
  const sims = useMemo(() => ({
    base: simulatePlan(debts, 0, 'avalanche', today),
    snowball: simulatePlan(debts, extra, 'snowball', today),
    avalanche: simulatePlan(debts, extra, 'avalanche', today),
  }), [debts, extra, today]);
  const name = (id: string) => debts.find((d) => d.id === id)?.name ?? id;

  if (debts.length === 0) return (<><PageHeader title="Debt-Free Planner" /><Empty title="Tidak ada utang aktif" hint="Tambahkan utang untuk melihat strategi pelunasan." /></>);

  const col = (title: string, desc: string, r: PlanResult, best: boolean) => (
    <Card className={best ? 'border-teal-500' : ''}>
      <h2 className="font-semibold">{title}{best && <span className="ml-2 rounded-full bg-teal-100 px-2 py-0.5 text-xs text-teal-800">Bunga paling hemat</span>}</h2>
      <p className="text-xs text-teal-900/70">{desc}</p>
      {r.converged ? (
        <>
          <p className="mt-3 text-2xl font-semibold">{r.freeDate ? monthID(r.freeDate) : '-'}</p>
          <p className="text-sm text-teal-900/70">{r.months} bulan · bunga {rupiah(r.totalInterest)}</p>
          <ol className="mt-3 space-y-1 text-sm">{r.order.map((id, k) => <li key={id}>{k + 1}. {name(id)} <span className="text-teal-900/60">(bulan ke-{r.payoffMonth[id]})</span></li>)}</ol>
        </>
      ) : <div className="mt-3"><Notice tone="warn">Dengan pembayaran ini utang tidak lunas dalam 50 tahun. Naikkan pembayaran tambahan.</Notice></div>}
    </Card>
  );

  const sn = sims.snowball;
  const av = sims.avalanche;
  const best = sn.converged && av.converged ? (av.totalInterest <= sn.totalInterest ? 'avalanche' : 'snowball') : 'avalanche';
  const saved = sims.base.converged && av.converged ? sims.base.months - av.months : 0;

  return (
    <>
      <PageHeader title="Debt-Free Planner" sub="Bandingkan strategi Snowball dan Avalanche dengan dana tambahan tiap bulan." />
      <Card>
        <Field label="Dana tambahan per bulan (Rp)" hint="Di luar cicilan minimum semua utang aktif."><MoneyInput value={extra} onChange={setExtra} /></Field>
        {extra > 0 && saved > 0 && <p className="mt-3 text-sm">Dengan dana ini Anda bebas utang <strong>{saved} bulan lebih cepat</strong> daripada hanya membayar cicilan minimum.</p>}
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {col('Snowball', 'Lunasi saldo terkecil lebih dulu.', sn, best === 'snowball')}
        {col('Avalanche', 'Lunasi bunga tertinggi lebih dulu.', av, best === 'avalanche')}
      </div>
      <Notice>Simulasi memakai sisa pokok, bunga per tahun, dan cicilan berikutnya sebagai pembayaran minimum. Untuk bunga flat atau denda, hasilnya perkiraan.</Notice>
    </>
  );
}
