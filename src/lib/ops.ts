import type { Data, Debt, DebtType, InterestMethod, Installment, Payment, Settings, StoredAllocation } from './types.ts';
import type { Op } from './api.ts';
import type { BackupFile } from './backup.ts';
import { buildSchedule } from './calc/schedule.ts';
import { allocatePayment, outstandingTotal, payoffAmount, summarize } from './calc/payments.ts';
import { uid } from './format.ts';

export interface DebtInput {
  name: string;
  lender: string;
  type: DebtType;
  principal: number;
  annualRatePct: number;
  termMonths: number;
  startDate: string;
  dueDay: number;
  method: InterestMethod;
  monthlyFee: number;
}

export const emptyData = (): Data => ({ debts: [], installments: [], payments: [], paymentAllocations: [], categories: [], settings: { id: 'main' } });

export function validateDebtInput(i: DebtInput): string | null {
  if (!i.name.trim()) return 'Nama utang wajib diisi.';
  if (!Number.isInteger(i.principal) || i.principal <= 0) return 'Pokok pinjaman harus lebih dari 0.';
  if (!(i.annualRatePct >= 0 && i.annualRatePct <= 1000)) return 'Bunga per tahun harus 0 sampai 1000.';
  if (!Number.isInteger(i.termMonths) || i.termMonths < 1 || i.termMonths > 120) return 'Tenor harus 1 sampai 120 bulan.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(i.startDate)) return 'Tanggal mulai tidak valid.';
  if (!Number.isInteger(i.dueDay) || i.dueDay < 1 || i.dueDay > 31) return 'Tanggal jatuh tempo harus 1 sampai 31.';
  if (!Number.isInteger(i.monthlyFee) || i.monthlyFee < 0) return 'Biaya bulanan tidak valid.';
  return null;
}

export function makeDebt(input: DebtInput, id = uid('debt')): { debt: Debt; installments: Installment[] } {
  const debt: Debt = { id, ...input, name: input.name.trim(), lender: input.lender.trim(), remainingPrincipal: input.principal, status: 'active' };
  const installments = buildSchedule({ debtId: id, ...input });
  return { debt, installments };
}

export const addDebtOps = (d: { debt: Debt; installments: Installment[] }): Op[] => [
  { op: 'put', collection: 'debts', doc: d.debt },
  ...d.installments.map((i): Op => ({ op: 'put', collection: 'installments', doc: i })),
];

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function debtAfter(debt: Debt, insts: Installment[], date: string): Debt {
  const s = summarize(insts, date);
  return { ...debt, remainingPrincipal: s.remainingPrincipal, status: s.remainingObligation === 0 ? 'paid' : 'active' };
}

export function payOps(
  data: Data, debtId: string, amountIn: number, date: string, kind: Payment['kind'], note = '', newId: (p: string) => string = uid,
): { ops: Op[]; error?: string } {
  const debt = data.debts.find((d) => d.id === debtId);
  if (!debt) return { ops: [], error: 'Utang tidak ditemukan.' };
  const original = data.installments.filter((i) => i.debtId === debtId);
  const insts = original.map((i) => ({ ...i }));
  let amount = amountIn;
  let waived: Payment['waived'];
  if (kind === 'early_payoff') {
    amount = payoffAmount(insts, date);
    waived = {};
    for (const i of insts) {
      if (i.dueDate > date && (i.interestDue > i.paidInterest || i.feeDue > i.paidFee || i.penaltyDue > i.paidPenalty)) {
        waived[i.id] = { interestDue: i.interestDue, feeDue: i.feeDue, penaltyDue: i.penaltyDue };
        i.interestDue = i.paidInterest;
        i.feeDue = i.paidFee;
        i.penaltyDue = i.paidPenalty;
      }
    }
  }
  if (!Number.isInteger(amount) || amount <= 0) return { ops: [], error: 'Jumlah pembayaran harus lebih dari 0.' };
  const { allocations, unallocated } = allocatePayment(insts, amount);
  if (unallocated > 0) return { ops: [], error: `Pembayaran melebihi sisa kewajiban sebesar ${unallocated}.` };

  const payment: Payment = { id: newId('pay'), debtId, date, amount, kind, ...(note ? { note } : {}), ...(waived && Object.keys(waived).length ? { waived } : {}) };
  const stored: StoredAllocation[] = allocations.map((a) => ({ ...a, id: `${payment.id}__${a.installmentId}`, paymentId: payment.id, debtId, date }));
  for (const a of allocations) {
    const i = insts.find((x) => x.id === a.installmentId)!;
    i.paidPenalty += a.penalty;
    i.paidFee += a.fee;
    i.paidInterest += a.interest;
    i.paidPrincipal += a.principal;
  }
  const changed = insts.filter((i) => !same(i, original.find((o) => o.id === i.id)));
  return {
    ops: [
      { op: 'put', collection: 'payments', doc: payment },
      ...stored.map((a): Op => ({ op: 'put', collection: 'paymentAllocations', doc: a })),
      ...changed.map((i): Op => ({ op: 'put', collection: 'installments', doc: i })),
      { op: 'put', collection: 'debts', doc: debtAfter(debt, insts, date) },
    ],
  };
}

export function undoPaymentOps(data: Data, paymentId: string): { ops: Op[]; error?: string } {
  const payment = data.payments.find((p) => p.id === paymentId);
  if (!payment) return { ops: [], error: 'Pembayaran tidak ditemukan.' };
  const debt = data.debts.find((d) => d.id === payment.debtId);
  if (!debt) return { ops: [], error: 'Utang tidak ditemukan.' };
  const allocs = data.paymentAllocations.filter((a) => a.paymentId === paymentId);
  const original = data.installments.filter((i) => i.debtId === debt.id);
  const insts = original.map((i) => ({ ...i }));
  for (const a of allocs) {
    const i = insts.find((x) => x.id === a.installmentId);
    if (!i) continue;
    i.paidPenalty -= a.penalty;
    i.paidFee -= a.fee;
    i.paidInterest -= a.interest;
    i.paidPrincipal -= a.principal;
  }
  for (const [iid, w] of Object.entries(payment.waived ?? {})) {
    const i = insts.find((x) => x.id === iid);
    if (i) Object.assign(i, w);
  }
  const changed = insts.filter((i) => !same(i, original.find((o) => o.id === i.id)));
  return {
    ops: [
      ...allocs.map((a): Op => ({ op: 'delete', collection: 'paymentAllocations', id: a.id })),
      { op: 'delete', collection: 'payments', id: paymentId },
      ...changed.map((i): Op => ({ op: 'put', collection: 'installments', doc: i })),
      { op: 'put', collection: 'debts', doc: debtAfter(debt, insts, payment.date) },
    ],
  };
}

export function addPenaltyOps(data: Data, installmentId: string, amount: number): { ops: Op[]; error?: string } {
  if (!Number.isInteger(amount) || amount <= 0) return { ops: [], error: 'Denda harus lebih dari 0.' };
  const inst = data.installments.find((i) => i.id === installmentId);
  const debt = inst && data.debts.find((d) => d.id === inst.debtId);
  if (!inst || !debt) return { ops: [], error: 'Cicilan tidak ditemukan.' };
  const next = { ...inst, penaltyDue: inst.penaltyDue + amount };
  const all = data.installments.filter((i) => i.debtId === debt.id).map((i) => (i.id === inst.id ? next : i));
  return { ops: [{ op: 'put', collection: 'installments', doc: next }, { op: 'put', collection: 'debts', doc: debtAfter(debt, all, inst.dueDate) }] };
}

export function updateDebtOps(data: Data, debtId: string, patch: Pick<Debt, 'name' | 'lender' | 'type'>): { ops: Op[]; error?: string } {
  const debt = data.debts.find((d) => d.id === debtId);
  if (!debt) return { ops: [], error: 'Utang tidak ditemukan.' };
  if (!patch.name.trim()) return { ops: [], error: 'Nama utang wajib diisi.' };
  const updated: Debt = { ...debt, ...patch, name: patch.name.trim(), lender: patch.lender.trim() };
  return { ops: [{ op: 'put', collection: 'debts', doc: updated }] };
}

export function deleteDebtOps(data: Data, debtId: string): Op[] {
  return [
    ...data.paymentAllocations.filter((a) => a.debtId === debtId).map((a): Op => ({ op: 'delete', collection: 'paymentAllocations', id: a.id })),
    ...data.payments.filter((p) => p.debtId === debtId).map((p): Op => ({ op: 'delete', collection: 'payments', id: p.id })),
    ...data.installments.filter((i) => i.debtId === debtId).map((i): Op => ({ op: 'delete', collection: 'installments', id: i.id })),
    { op: 'delete', collection: 'debts', id: debtId },
  ];
}

export function applyOps(data: Data, ops: Op[]): Data {
  const next: Data = { ...data };
  const lists = next as unknown as Record<string, { id: string }[]>;
  const copied = new Set<string>();
  for (const op of ops) {
    if (op.collection === 'settings') {
      if (op.op === 'put') next.settings = op.doc as unknown as Settings;
      continue;
    }
    if (!copied.has(op.collection)) {
      lists[op.collection] = [...(lists[op.collection] ?? [])];
      copied.add(op.collection);
    }
    const arr = lists[op.collection]!;
    const id = op.op === 'put' ? op.doc.id : op.id;
    const idx = arr.findIndex((x) => x.id === id);
    if (op.op === 'put') {
      if (idx >= 0) arr[idx] = op.doc;
      else arr.push(op.doc);
    } else if (idx >= 0) arr.splice(idx, 1);
  }
  return next;
}

export function listToData(list: Record<string, Record<string, unknown>[]>): Data {
  const g = <T,>(k: string) => (list[k] ?? []) as unknown as T[];
  return {
    debts: g<Debt>('debts'),
    installments: g<Installment>('installments'),
    payments: g<Payment>('payments'),
    paymentAllocations: g<StoredAllocation>('paymentAllocations'),
    categories: g('categories'),
    settings: { ...((list.settings?.[0] as unknown as Settings | undefined) ?? {}), id: 'main' },
  };
}

export function backupToData(b: BackupFile): Data {
  return listToData({ ...b.data, settings: b.settings ? [b.settings] : [] });
}

export function dataToBackupParts(d: Data): { data: BackupFile['data']; settings: BackupFile['settings'] } {
  const c = <T,>(x: T[]) => x as unknown as Record<string, unknown>[];
  return {
    data: { debts: c(d.debts), installments: c(d.installments), payments: c(d.payments), paymentAllocations: c(d.paymentAllocations), categories: c(d.categories) },
    settings: d.settings as unknown as Record<string, unknown>,
  };
}

export { outstandingTotal };
