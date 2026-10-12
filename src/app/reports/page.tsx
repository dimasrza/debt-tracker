'use client';
import { useMemo } from 'react';
import { useData } from '@/lib/store';
import { toCsv } from '@/lib/csv';
import { download } from '@/lib/download';
import { rupiah, todayISO, typeLabel } from '@/lib/format';
import { installmentStatus, outstandingTotal, summarize } from '@/lib/calc/payments';
import { Btn, Card, Empty, PageHeader } from '@/components/ui';

export default function Reports() {
  const { data } = useData();
  const today = todayISO();
  const rows = useMemo(() => data.debts.map((d) => {
    const insts = data.installments.filter((i) => i.debtId === d.id);
    const s = summarize(insts, today);
    return { nama: d.name, jenis: typeLabel(d.type), pemberi: d.lender, pokok_awal: d.principal, bunga_pct: d.annualRatePct, tenor: d.termMonths, sisa_pokok: s.remainingPrincipal, sisa_kewajiban: s.remainingObligation, tunggakan: s.overdueAmount, status: d.status === 'paid' ? 'Lunas' : 'Aktif' };
  }), [data, today]);
  const debtName = (id: string) => data.debts.find((d) => d.id === id)?.name ?? '';

  const exportDebts = () => download(`utang-${today}.csv`, toCsv(rows, ['nama', 'jenis', 'pemberi', 'pokok_awal', 'bunga_pct', 'tenor', 'sisa_pokok', 'sisa_kewajiban', 'tunggakan', 'status']), 'text/csv');
  const exportInst = () => download(`cicilan-${today}.csv`, toCsv(
    data.installments.map((i) => ({ utang: debtName(i.debtId), ke: i.number, jatuh_tempo: i.dueDate, pokok: i.principalDue, bunga: i.interestDue, biaya: i.feeDue, denda: i.penaltyDue, sisa: outstandingTotal(i), status: installmentStatus(i, today) })),
    ['utang', 'ke', 'jatuh_tempo', 'pokok', 'bunga', 'biaya', 'denda', 'sisa', 'status']), 'text/csv');
  const exportPay = () => download(`pembayaran-${today}.csv`, toCsv(
    data.payments.map((p) => ({ tanggal: p.date, utang: debtName(p.debtId), jenis: p.kind, jumlah: p.amount, catatan: p.note ?? '' })),
    ['tanggal', 'utang', 'jenis', 'jumlah', 'catatan']), 'text/csv');

  if (data.debts.length === 0) return (<><PageHeader title="Laporan" /><Empty title="Belum ada data untuk dilaporkan" /></>);
  return (
    <>
      <PageHeader title="Laporan" sub={`Posisi per ${today}`} />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] text-left text-sm">
            <thead className="text-xs text-teal-900/70"><tr><th className="py-2 font-medium">Utang</th><th className="text-right font-medium">Sisa pokok</th><th className="text-right font-medium">Sisa kewajiban</th><th className="text-right font-medium">Tunggakan</th></tr></thead>
            <tbody className="divide-y divide-teal-50">
              {rows.map((r) => (<tr key={r.nama}><td className="py-2">{r.nama}</td><td className="text-right">{rupiah(r.sisa_pokok)}</td><td className="text-right">{rupiah(r.sisa_kewajiban)}</td><td className={`text-right ${r.tunggakan ? 'text-rose-700' : ''}`}>{rupiah(r.tunggakan)}</td></tr>))}
            </tbody>
            <tfoot><tr className="border-t border-teal-200 font-semibold"><td className="py-2">Total</td><td className="text-right">{rupiah(rows.reduce((a, r) => a + r.sisa_pokok, 0))}</td><td className="text-right">{rupiah(rows.reduce((a, r) => a + r.sisa_kewajiban, 0))}</td><td className="text-right">{rupiah(rows.reduce((a, r) => a + r.tunggakan, 0))}</td></tr></tfoot>
          </table>
        </div>
      </Card>
      <Card>
        <h2 className="mb-3 font-semibold">Ekspor CSV</h2>
        <div className="flex flex-col gap-2 sm:flex-row"><Btn variant="ghost" onClick={exportDebts}>Ringkasan utang</Btn><Btn variant="ghost" onClick={exportInst}>Jadwal cicilan</Btn><Btn variant="ghost" onClick={exportPay}>Riwayat pembayaran</Btn></div>
      </Card>
    </>
  );
}
