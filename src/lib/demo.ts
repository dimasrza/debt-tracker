import type { Data } from './types.ts';
import { addMonths } from './calc/dates.ts';
import { applyOps, addDebtOps, emptyData, makeDebt, payOps } from './ops.ts';
import type { DebtInput } from './ops.ts';
import { outstandingTotal } from './calc/payments.ts';

/** In-memory sample data. Never written to the Google Sheet. */
export function buildDemo(today: string): Data {
  let seq = 0;
  const newId = (p: string) => `${p}_demo${++seq}`;
  const specs: { input: Omit<DebtInput, 'startDate'>; monthsAgo: number; paid: number }[] = [
    { input: { name: 'Kartu kredit Bank A', lender: 'Bank A', type: 'kartu_kredit', principal: 6_000_000, annualRatePct: 30, termMonths: 12, dueDay: 5, method: 'annuity', monthlyFee: 0 }, monthsAgo: 4, paid: 4 },
    { input: { name: 'Paylater belanja', lender: 'Paylater B', type: 'paylater', principal: 2_400_000, annualRatePct: 24, termMonths: 6, dueDay: 20, method: 'flat', monthlyFee: 10_000 }, monthsAgo: 3, paid: 2 },
    { input: { name: 'Kredit motor', lender: 'Leasing C', type: 'cicilan_barang', principal: 18_000_000, annualRatePct: 14, termMonths: 24, dueDay: 12, method: 'annuity', monthlyFee: 25_000 }, monthsAgo: 6, paid: 6 },
    { input: { name: 'Pinjaman teman', lender: 'Rudi', type: 'pribadi', principal: 1_500_000, annualRatePct: 0, termMonths: 5, dueDay: 28, method: 'flat', monthlyFee: 0 }, monthsAgo: 2, paid: 1 },
  ];
  let data = emptyData();
  specs.forEach((s, n) => {
    const d = makeDebt({ ...s.input, startDate: addMonths(today, -s.monthsAgo, 1) }, `debt_demo${n + 1}`);
    data = applyOps(data, addDebtOps(d));
    for (let k = 0; k < s.paid; k++) {
      const inst = data.installments.filter((i) => i.debtId === d.debt.id).sort((a, b) => a.number - b.number)[k]!;
      const r = payOps(data, d.debt.id, outstandingTotal(inst), inst.dueDate, 'full', '', newId);
      if (!r.error) data = applyOps(data, r.ops);
    }
  });
  return data;
}
