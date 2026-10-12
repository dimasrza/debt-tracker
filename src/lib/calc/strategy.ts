import { addMonths } from './dates.ts';

export interface PlanDebt {
  id: string;
  name: string;
  balance: number;
  annualRatePct: number;
  minPayment: number;
}

export type Strategy = 'snowball' | 'avalanche';

export interface PlanResult {
  months: number;
  totalInterest: number;
  payoffMonth: Record<string, number>;
  order: string[];
  freeDate: string | null;
  converged: boolean;
}

export function simulatePlan(debts: PlanDebt[], extraMonthly: number, strategy: Strategy, startDate: string, maxMonths = 600): PlanResult {
  const state = debts.map((d) => ({ ...d }));
  const payoffMonth: Record<string, number> = {};
  const order: string[] = [];
  let totalInterest = 0;
  let month = 0;
  const budget = state.reduce((s, d) => s + d.minPayment, 0) + extraMonthly;

  const active = () => state.filter((d) => d.balance > 0);

  while (active().length > 0 && month < maxMonths) {
    month++;
    for (const d of active()) {
      const interest = Math.round((d.balance * d.annualRatePct) / 12 / 100);
      d.balance += interest;
      totalInterest += interest;
    }
    let pool = budget;
    for (const d of active()) {
      const pay = Math.min(d.minPayment, d.balance, pool);
      d.balance -= pay;
      pool -= pay;
    }
    const targets = active().sort((a, b) =>
      strategy === 'snowball' ? a.balance - b.balance : b.annualRatePct - a.annualRatePct || a.balance - b.balance,
    );
    for (const d of targets) {
      if (pool <= 0) break;
      const pay = Math.min(d.balance, pool);
      d.balance -= pay;
      pool -= pay;
    }
    for (const d of state) {
      if (d.balance <= 0 && payoffMonth[d.id] === undefined) {
        payoffMonth[d.id] = month;
        order.push(d.id);
      }
    }
  }
  const converged = active().length === 0;
  return { months: month, totalInterest, payoffMonth, order, freeDate: converged ? addMonths(startDate, month) : null, converged };
}
