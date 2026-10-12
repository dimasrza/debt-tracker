'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { useData } from '@/lib/store';
import { dateID, DEBT_TYPES, rupiah, todayISO, typeLabel } from '@/lib/format';
import { installmentStatus, outstandingTotal, summarize } from '@/lib/calc/payments';
import { Badge, Btn, Card, Empty, Field, Input, Modal, MoneyInput, Notice, PageHeader, Progress, Select } from '@/components/ui';
import { PayForm } from '@/components/PayForm';
import type { DebtType } from '@/lib/types';

function Detail() {
  const id = useSearchParams().get('id') ?? '';
  const router = useRouter();
  const { data, updateDebt, deleteDebt, addPenalty, undoPayment } = useData();
  const today = todayISO();
  const debt = data.debts.find((d) => d.id === id);
  const insts = useMemo(() => data.installments.filter((i) => i.debtId === id).sort((a, b) => a.number - b.number), [data.installments, id]);
  const pays = useMemo(() => data.payments.filter((p) => p.debtId === id).sort((a, b) => b.date.localeCompare(a.date)), [data.payments, id]);
  const [modal, setModal] = useState<'pay' | 'edit' | 'delete' | { penalty: string } | null>(null);
  const [err, setErr] = useState('');
  const [edit, setEdit] = useState({ name: '', lender: '', type: 'bank' as DebtType });
  const [pen, setPen] = useState(0);

  if (!debt) return <Empty title="Utang tidak ditemukan" action={<Link href="/debts/" className="text-sm underline">Kembali ke daftar</Link>} />;
  const s = summarize(insts, today);
  const paidInterest = insts.reduce((a, i) => a + i.paidInterest, 0);
  const totalInterest = insts.reduce((a, i) => a + i.interestDue, 0);

  const done = async (p: Promise<{ ok: boolean; error?: string }>, after?: () => void) => {
    setErr('');
    const r = await p;
    if (r.ok) { setModal(null); after?.(); } else setErr(r.error ?? 'Gagal.');
  };

  return (
    <>
      <PageHeader title={debt.name} sub={`${typeLabel(debt.type)}${debt.lender ? ` · ${debt.lender}` : ''} · ${debt.annualRatePct}% per tahun · ${debt.method === 'flat' ? 'flat' : 'anuitas'}`}
        action={debt.status === 'active' ? <Btn onClick={() => { setErr(''); setModal('pay'); }}>Bayar</Btn> : <Badge kind="paid" />} />
      <Card>
        <p className="text-sm text-teal-900/70">Sisa pokok</p>
        <p className="text-3xl font-semibold">{rupiah(s.remainingPrincipal)}</p>
        <div className="mt-3"><Progress value={1 - s.remainingPrincipal / debt.principal} /></div>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div><dt className="text-xs text-teal-900/70">Pokok awal</dt><dd className="font-semibold">{rupiah(debt.principal)}</dd></div>
          <div><dt className="text-xs text-teal-900/70">Sisa kewajiban</dt><dd className="font-semibold">{rupiah(s.remainingObligation)}</dd></div>
          <div><dt className="text-xs text-teal-900/70">Bunga terbayar / total</dt><dd className="font-semibold">{rupiah(paidInterest)} / {rupiah(totalInterest)}</dd></div>
          <div><dt className="text-xs text-teal-900/70">Tunggakan</dt><dd className={`font-semibold ${s.overdueCount ? 'text-rose-700' : ''}`}>{s.overdueCount ? rupiah(s.overdueAmount) : 'Tidak ada'}</dd></div>
        </dl>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Jadwal cicilan</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="text-xs text-teal-900/70"><tr><th className="py-2 pr-2 font-medium">Ke</th><th className="font-medium">Jatuh tempo</th><th className="text-right font-medium">Pokok</th><th className="text-right font-medium">Bunga</th><th className="text-right font-medium">Sisa</th><th className="pl-3 font-medium">Status</th><th /></tr></thead>
            <tbody className="divide-y divide-teal-50">
              {insts.map((i) => {
                const st = installmentStatus(i, today);
                return (
                  <tr key={i.id}>
                    <td className="py-2 pr-2">{i.number}</td><td>{dateID(i.dueDate)}</td>
                    <td className="text-right">{rupiah(i.principalDue)}</td><td className="text-right">{rupiah(i.interestDue)}</td>
                    <td className="text-right font-medium">{rupiah(outstandingTotal(i))}</td>
                    <td className="pl-3"><Badge kind={st} /></td>
                    <td className="text-right">{st === 'overdue' && <button className="px-2 py-1 text-xs text-rose-700 underline" onClick={() => { setPen(0); setErr(''); setModal({ penalty: i.id }); }}>+ denda</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-teal-900/70">Total termasuk biaya bulanan dan denda yang dicatat.</p>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Pembayaran</h2>
        {pays.length === 0 ? <p className="text-sm text-teal-900/70">Belum ada pembayaran.</p> : (
          <ul className="divide-y divide-teal-50">
            {pays.map((p) => (
              <li key={p.id} className="flex min-h-12 items-center justify-between gap-2 py-2 text-sm">
                <span>{dateID(p.date)} · {{ full: 'Cicilan penuh', partial: 'Sebagian', early_payoff: 'Pelunasan' }[p.kind]}{p.note ? ` · ${p.note}` : ''}</span>
                <span className="flex items-center gap-3"><strong>{rupiah(p.amount)}</strong>
                  <button className="text-xs text-rose-700 underline" onClick={() => { if (window.confirm('Batalkan pembayaran ini? Cicilan akan kembali seperti sebelum dibayar.')) void undoPayment(p.id); }}>Batalkan</button></span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="flex gap-2">
        <Btn variant="ghost" onClick={() => { setEdit({ name: debt.name, lender: debt.lender, type: debt.type }); setErr(''); setModal('edit'); }}>Ubah info</Btn>
        <Btn variant="danger" onClick={() => { setErr(''); setModal('delete'); }}>Hapus utang</Btn>
      </div>

      {modal === 'pay' && <Modal title="Catat pembayaran" onClose={() => setModal(null)}><PayForm debtId={id} onDone={() => setModal(null)} /></Modal>}
      {modal === 'edit' && (
        <Modal title="Ubah info utang" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <Field label="Nama"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Pemberi pinjaman"><Input value={edit.lender} onChange={(e) => setEdit({ ...edit, lender: e.target.value })} /></Field>
            <Field label="Jenis"><Select value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value as DebtType })}>{DEBT_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
            <p className="text-xs text-teal-900/70">Pokok, bunga, dan tenor tidak bisa diubah agar jadwal tetap konsisten. Hapus lalu buat ulang jika salah input.</p>
            {err && <Notice tone="error">{err}</Notice>}
            <Btn className="w-full" onClick={() => void done(updateDebt(id, edit))}>Simpan perubahan</Btn>
          </div>
        </Modal>
      )}
      {modal === 'delete' && (
        <Modal title="Hapus utang?" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <Notice tone="warn">Utang, seluruh jadwal, dan {pays.length} pembayaran akan dihapus permanen. Buat backup dulu jika ragu.</Notice>
            {err && <Notice tone="error">{err}</Notice>}
            <Btn variant="danger" className="w-full" onClick={() => void done(deleteDebt(id), () => router.push('/debts/'))}>Ya, hapus utang ini</Btn>
          </div>
        </Modal>
      )}
      {typeof modal === 'object' && modal && (
        <Modal title="Tambah denda" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <Field label="Jumlah denda (Rp)"><MoneyInput value={pen} onChange={setPen} /></Field>
            {err && <Notice tone="error">{err}</Notice>}
            <Btn className="w-full" onClick={() => void done(addPenalty(modal.penalty, pen))}>Tambah denda</Btn>
          </div>
        </Modal>
      )}
    </>
  );
}

export default function Page() {
  return <Suspense fallback={<p className="py-20 text-center text-teal-900/70">Memuat…</p>}><Detail /></Suspense>;
}
