'use client';
import { useState } from 'react';
import { useData } from '@/lib/store';
import { DEBT_TYPES, todayISO } from '@/lib/format';
import type { DebtInput } from '@/lib/ops';
import type { DebtType, InterestMethod } from '@/lib/types';
import { Btn, Field, Input, MoneyInput, Notice, Select } from './ui';

export function DebtForm({ onDone }: { onDone: () => void }) {
  const { addDebt } = useData();
  const [f, setF] = useState<DebtInput>({
    name: '', lender: '', type: 'bank', principal: 0, annualRatePct: 0, termMonths: 12,
    startDate: todayISO(), dueDay: Math.min(28, new Date().getDate()), method: 'annuity', monthlyFee: 0,
  });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof DebtInput>(k: K, v: DebtInput[K]) => setF((p) => ({ ...p, [k]: v }));

  async function submit() {
    setBusy(true);
    setErr('');
    const r = await addDebt(f);
    setBusy(false);
    if (r.ok) onDone();
    else setErr(r.error);
  }

  return (
    <div className="space-y-3">
      <Field label="Nama utang"><Input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Contoh: Kartu kredit Bank A" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Pemberi pinjaman"><Input value={f.lender} onChange={(e) => set('lender', e.target.value)} /></Field>
        <Field label="Jenis">
          <Select value={f.type} onChange={(e) => set('type', e.target.value as DebtType)}>
            {DEBT_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Pokok pinjaman (Rp)"><MoneyInput value={f.principal} onChange={(n) => set('principal', n)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Bunga per tahun (%)"><Input type="number" inputMode="decimal" min={0} step="0.1" value={f.annualRatePct} onChange={(e) => set('annualRatePct', Number(e.target.value))} /></Field>
        <Field label="Tenor (bulan)"><Input type="number" inputMode="numeric" min={1} max={120} value={f.termMonths} onChange={(e) => set('termMonths', Number(e.target.value))} /></Field>
      </div>
      <Field label="Metode bunga" hint="Anuitas: bunga dari sisa pokok. Flat: bunga dari pokok awal.">
        <Select value={f.method} onChange={(e) => set('method', e.target.value as InterestMethod)}>
          <option value="annuity">Anuitas (sisa pokok)</option>
          <option value="flat">Flat</option>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tanggal pinjaman"><Input type="date" value={f.startDate} onChange={(e) => set('startDate', e.target.value)} /></Field>
        <Field label="Jatuh tempo tiap tanggal"><Input type="number" inputMode="numeric" min={1} max={31} value={f.dueDay} onChange={(e) => set('dueDay', Number(e.target.value))} /></Field>
      </div>
      <Field label="Biaya per bulan (Rp)" hint="Biaya admin atau asuransi per cicilan. Kosongkan jika tidak ada."><MoneyInput value={f.monthlyFee} onChange={(n) => set('monthlyFee', n)} /></Field>
      {err && <Notice tone="error">{err}</Notice>}
      <Btn onClick={submit} disabled={busy} className="w-full">{busy ? 'Menyimpan…' : 'Simpan utang'}</Btn>
    </div>
  );
}
