import type { Installment, InterestMethod } from '../types.ts';
import { addMonths } from './dates.ts';

export interface ScheduleInput {
  debtId: string;
  principal: number;
  annualRatePct: number;
  termMonths: number;
  startDate: string; // first installment is one month after this date
  dueDay: number;
  method: InterestMethod;
  monthlyFee: number;
}

export function buildSchedule(inp: ScheduleInput): Installment[] {
  const { principal: P, termMonths: n, annualRatePct } = inp;
  if (!Number.isInteger(P) || P <= 0) throw new Error('principal must be a positive integer');
  if (!Number.isInteger(n) || n <= 0) throw new Error('termMonths must be a positive integer');
  const r = annualRatePct / 12 / 100;
  const rows: Installment[] = [];
  let balance = P;

  const annuityPayment = r === 0 ? Math.round(P / n) : Math.round((P * r) / (1 - Math.pow(1 + r, -n)));
  const flatInterest = Math.round((P * annualRatePct / 100 * n) / 12 / n);
  const flatPrincipal = Math.floor(P / n);

  for (let i = 1; i <= n; i++) {
    const last = i === n;
    let interest: number;
    let principal: number;
    if (inp.method === 'flat') {
      interest = flatInterest;
      principal = last ? balance : flatPrincipal;
    } else {
      interest = Math.round(balance * r);
      principal = last ? balance : Math.min(balance, annuityPayment - interest);
    }
    balance -= principal;
    rows.push({
      id: `${inp.debtId}_${String(i).padStart(3, '0')}`,
      debtId: inp.debtId,
      number: i,
      dueDate: addMonths(inp.startDate, i, inp.dueDay),
      principalDue: principal,
      interestDue: interest,
      feeDue: inp.monthlyFee,
      penaltyDue: 0,
      paidPrincipal: 0,
      paidInterest: 0,
      paidFee: 0,
      paidPenalty: 0,
    });
  }
  return rows;
}
