import type { Allocation, Installment } from '../types.ts';

export type InstallmentStatus = 'paid' | 'partial' | 'overdue' | 'upcoming';

export function outstanding(i: Installment) {
  return {
    penalty: i.penaltyDue - i.paidPenalty,
    fee: i.feeDue - i.paidFee,
    interest: i.interestDue - i.paidInterest,
    principal: i.principalDue - i.paidPrincipal,
  };
}

export function outstandingTotal(i: Installment): number {
  const o = outstanding(i);
  return o.penalty + o.fee + o.interest + o.principal;
}

export function installmentStatus(i: Installment, today: string): InstallmentStatus {
  const left = outstandingTotal(i);
  if (left <= 0) return 'paid';
  if (i.dueDate < today) return 'overdue';
  const paidAny = i.paidPrincipal + i.paidInterest + i.paidFee + i.paidPenalty > 0;
  return paidAny ? 'partial' : 'upcoming';
}

/** Oldest installment first; inside one installment: penalty, fee, interest, principal. */
export function allocatePayment(installments: Installment[], amount: number): { allocations: Allocation[]; unallocated: number } {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('amount must be a positive integer');
  let left = amount;
  const allocations: Allocation[] = [];
  const sorted = [...installments].sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.number - b.number);
  for (const inst of sorted) {
    if (left <= 0) break;
    const o = outstanding(inst);
    const a: Allocation = { installmentId: inst.id, penalty: 0, fee: 0, interest: 0, principal: 0 };
    for (const k of ['penalty', 'fee', 'interest', 'principal'] as const) {
      const take = Math.min(left, o[k]);
      a[k] = take;
      left -= take;
    }
    if (a.penalty + a.fee + a.interest + a.principal > 0) allocations.push(a);
  }
  return { allocations, unallocated: left };
}

/** Payoff today: everything due up to today plus remaining principal of future installments (no future interest/fees). */
export function payoffAmount(installments: Installment[], today: string): number {
  let total = 0;
  for (const i of installments) {
    const o = outstanding(i);
    if (i.dueDate <= today) total += o.penalty + o.fee + o.interest + o.principal;
    else total += o.principal;
  }
  return total;
}

export function summarize(installments: Installment[], today: string) {
  let remainingPrincipal = 0;
  let remainingObligation = 0;
  let overdueAmount = 0;
  let overdueCount = 0;
  for (const i of installments) {
    const o = outstanding(i);
    remainingPrincipal += o.principal;
    const tot = o.penalty + o.fee + o.interest + o.principal;
    remainingObligation += tot;
    if (tot > 0 && i.dueDate < today) {
      overdueAmount += tot;
      overdueCount++;
    }
  }
  return { remainingPrincipal, remainingObligation, overdueAmount, overdueCount };
}
