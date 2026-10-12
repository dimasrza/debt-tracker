'use client';
import { useMemo, useState } from 'react';
import { useData } from '@/lib/store';
import { todayISO, rupiah } from '@/lib/format';
import { outstandingTotal, payoffAmount } from '@/lib/calc/payments';
import { Btn, Field, Input, MoneyInput, Notice } from './ui';

type Mode = 'full' | 'partial' | 'early_payoff';

export function PayForm({ debtId, onDone }: { debtId: string; onDone: () => void }) {
  const { data, pay } = useData();
  const insts = useMemo(() => data.installments.filter((i) => i.debtId === debtId), [data.installments, debtId]);
  const next = useMemo(() => insts.filter((i) => outstandingTotal(i) > 0).sort((a, b) => a.number - b.number)[0], [insts]);
  const [mode, setMode] = useState<Mode>('full');
  const [date, setDate] = useState(todayISO());
  const [custom, setCustom] = useState(0);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const amount = mode === 'full' ? (next ? outstandingTotal(next) : 0) : mode === 'early_payoff' ? payoffAmount(insts, date) : custom;

  async function submit() {
    setBusy(true);
    setErr('');
    const r = await pay(debtId, amount, date, mode, note.trim());
    setBusy(false);
    if (r.ok) onDone();
    else setErr(r.error);
  }

  const tab = (m: Mode, label: string) => (
    <button key={m} onClick={() => setMode(m)} aria-pressed={mode === m} className={`min-h-11 flex-1 rounded-xl px-2 text-sm ${mode === m ? 'bg-teal-700 text-white' : 'border border-teal-200 bg-white'}`}>{label}</button>
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-2">{tab('full', 'Cicilan penuh')}{tab('partial', 'Sebagian')}{tab('early_payoff', 'Lunasi')}</div>
      <Field label="Tanggal bayar"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      {mode === 'partial' ? (
        <Field label="Jumlah (Rp)" hint="Dialokasikan ke cicilan terlama: denda, biaya, bunga, lalu pokok."><MoneyInput value={custom} onChange={setCustom} /></Field>
      ) : (
        <Notice>{mode === 'full' ? `Cicilan ke-${next?.number ?? '-'}: ` : 'Total pelunasan (tanpa bunga dan biaya cicilan mendatang): '}<strong>{rupiah(amount)}</strong></Notice>
      )}
      <Field label="Catatan (opsional)"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      {err && <Notice tone="error">{err}</Notice>}
      <Btn onClick={submit} disabled={busy || amount <= 0} className="w-full">{busy ? 'Menyimpan…' : `Catat pembayaran ${rupiah(amount)}`}</Btn>
    </div>
  );
}
