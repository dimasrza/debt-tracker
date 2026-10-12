import type { Data, Installment } from './types.ts';
import { outstandingTotal, summarize } from './calc/payments.ts';
import { simulatePlan } from './calc/strategy.ts';
import type { PlanDebt } from './calc/strategy.ts';

export const unpaid = (i: Installment) => outstandingTotal(i) > 0;

export function dashboardStats(data: Data, today: string) {
  const all = data.installments;
  const s = summarize(all, today);
  const initial = data.debts.reduce((a, d) => a + d.principal, 0);
  const totalPaid = data.payments.reduce((a, p) => a + p.amount, 0);
  const open = all.filter(unpaid).sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.number - b.number);
  return {
    initial,
    remainingPrincipal: s.remainingPrincipal,
    remainingObligation: s.remainingObligation,
    overdueAmount: s.overdueAmount,
    overdueCount: s.overdueCount,
    totalPaid,
    activeCount: data.debts.filter((d) => d.status === 'active').length,
    paidCount: data.debts.filter((d) => d.status === 'paid').length,
    progress: initial > 0 ? Math.min(1, Math.max(0, 1 - s.remainingPrincipal / initial)) : 0,
    upcoming: open.filter((i) => i.dueDate >= today).slice(0, 5),
    overdue: open.filter((i) => i.dueDate < today),
    freeDate: lastDueDate(data),
  };
}

export function lastDueDate(data: Data): string | null {
  let max: string | null = null;
  for (const i of data.installments) if (unpaid(i) && (max === null || i.dueDate > max)) max = i.dueDate;
  return max;
}

/** Outstanding amount due per calendar month, starting at today's month (overdue amounts count toward this month). */
export function monthlyProjection(data: Data, today: string, months = 6) {
  const start = today.slice(0, 7);
  const buckets: { month: string; amount: number }[] = [];
  const [y, m] = start.split('-').map(Number) as [number, number];
  for (let k = 0; k < months; k++) {
    const t = m - 1 + k;
    buckets.push({ month: `${y + Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`, amount: 0 });
  }
  for (const i of data.installments) {
    const left = outstandingTotal(i);
    if (left <= 0) continue;
    const key = i.dueDate.slice(0, 7) < start ? start : i.dueDate.slice(0, 7);
    const b = buckets.find((x) => x.month === key);
    if (b) b.amount += left;
  }
  return buckets;
}

export function analysis(data: Data) {
  const byType: Record<string, number> = {};
  let weighted = 0;
  let remaining = 0;
  let interestLeft = 0;
  let principalLeft = 0;
  for (const d of data.debts) {
    const insts = data.installments.filter((i) => i.debtId === d.id);
    const p = insts.reduce((a, i) => a + i.principalDue - i.paidPrincipal, 0);
    const it = insts.reduce((a, i) => a + i.interestDue - i.paidInterest, 0);
    byType[d.type] = (byType[d.type] ?? 0) + p;
    weighted += p * d.annualRatePct;
    remaining += p;
    principalLeft += p;
    interestLeft += it;
  }
  return { byType, avgRate: remaining > 0 ? weighted / remaining : 0, interestLeft, principalLeft };
}

export function planDebts(data: Data): PlanDebt[] {
  const out: PlanDebt[] = [];
  for (const d of data.debts) {
    if (d.status !== 'active') continue;
    const insts = data.installments.filter((i) => i.debtId === d.id && unpaid(i)).sort((a, b) => a.number - b.number);
    const next = insts[0];
    if (!next) continue;
    const balance = insts.reduce((a, i) => a + i.principalDue - i.paidPrincipal, 0);
    out.push({ id: d.id, name: d.name, balance, annualRatePct: d.annualRatePct, minPayment: Math.max(1, next.principalDue + next.interestDue + next.feeDue) });
  }
  return out;
}

export { simulatePlan };
