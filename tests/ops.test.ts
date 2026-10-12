import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDebtOps, applyOps, deleteDebtOps, emptyData, makeDebt, payOps, undoPaymentOps, addPenaltyOps, validateDebtInput } from '../src/lib/ops.ts';
import type { DebtInput } from '../src/lib/ops.ts';
import { dashboardStats, monthlyProjection, planDebts, simulatePlan } from '../src/lib/stats.ts';
import { buildDemo } from '../src/lib/demo.ts';
import { summarize } from '../src/lib/calc/payments.ts';

const input: DebtInput = { name: 'Test', lender: 'X', type: 'bank', principal: 1_200_000, annualRatePct: 12, termMonths: 12, startDate: '2026-01-01', dueDay: 10, method: 'flat', monthlyFee: 5000 };
const setup = () => {
  const d = makeDebt(input, 'debt1');
  return applyOps(emptyData(), addDebtOps(d));
};

test('input validation', () => {
  assert.equal(validateDebtInput(input), null);
  assert.ok(validateDebtInput({ ...input, principal: 0 }));
  assert.ok(validateDebtInput({ ...input, termMonths: 500 }));
});

test('partial then early payoff closes the debt and waives future interest/fees', () => {
  let data = setup();
  const first = data.installments.find((i) => i.number === 1)!;
  const r1 = payOps(data, 'debt1', first.principalDue, '2026-02-10', 'partial', '', (p) => `${p}_1`);
  assert.equal(r1.error, undefined);
  data = applyOps(data, r1.ops);
  assert.equal(data.payments.length, 1);
  const r2 = payOps(data, 'debt1', 0, '2026-03-01', 'early_payoff', '', (p) => `${p}_2`);
  assert.equal(r2.error, undefined);
  data = applyOps(data, r2.ops);
  assert.equal(data.debts[0]!.status, 'paid');
  assert.equal(data.debts[0]!.remainingPrincipal, 0);
  assert.equal(summarize(data.installments, '2026-12-31').remainingObligation, 0);
  // total paid on principal equals loan principal
  assert.equal(data.installments.reduce((a, i) => a + i.paidPrincipal, 0), 1_200_000);
});

test('undo restores installments, debt and removes allocations', () => {
  const before = setup();
  const r = payOps(before, 'debt1', 0, '2026-03-01', 'early_payoff', '', (p) => `${p}_x`);
  const paid = applyOps(before, r.ops);
  assert.equal(paid.debts[0]!.status, 'paid');
  const u = undoPaymentOps(paid, 'pay_x');
  const restored = applyOps(paid, u.ops);
  assert.equal(restored.payments.length, 0);
  assert.equal(restored.paymentAllocations.length, 0);
  assert.deepEqual(restored.installments, before.installments);
  assert.equal(restored.debts[0]!.status, 'active');
  assert.equal(restored.debts[0]!.remainingPrincipal, 1_200_000);
});

test('overpayment is rejected, no ops produced', () => {
  const data = setup();
  const r = payOps(data, 'debt1', 99_999_999, '2026-02-10', 'partial');
  assert.ok(r.error);
  assert.equal(r.ops.length, 0);
});

test('penalty increases obligation and reopens a paid debt', () => {
  let data = setup();
  data = applyOps(data, payOps(data, 'debt1', 0, '2026-03-01', 'early_payoff', '', (p) => `${p}_z`).ops);
  const inst = data.installments[0]!;
  const r = addPenaltyOps(data, inst.id, 25_000);
  data = applyOps(data, r.ops);
  assert.equal(data.debts[0]!.status, 'active');
  assert.equal(summarize(data.installments, '2026-12-31').remainingObligation, 25_000);
});

test('delete debt removes everything related', () => {
  let data = setup();
  data = applyOps(data, payOps(data, 'debt1', 100_000, '2026-02-10', 'partial').ops);
  data = applyOps(data, deleteDebtOps(data, 'debt1'));
  assert.deepEqual([data.debts.length, data.installments.length, data.payments.length, data.paymentAllocations.length], [0, 0, 0, 0]);
});

test('demo data is consistent with dashboard stats', () => {
  const today = '2026-10-12';
  const demo = buildDemo(today);
  assert.equal(demo.debts.length, 4);
  for (const d of demo.debts) {
    const s = summarize(demo.installments.filter((i) => i.debtId === d.id), today);
    assert.equal(d.remainingPrincipal, s.remainingPrincipal);
  }
  const st = dashboardStats(demo, today);
  assert.equal(st.totalPaid, demo.payments.reduce((a, p) => a + p.amount, 0));
  assert.ok(st.remainingPrincipal < st.initial && st.progress > 0 && st.progress < 1);
  assert.ok(st.freeDate && st.freeDate > today);
  const proj = monthlyProjection(demo, today, 6);
  assert.equal(proj.length, 6);
  assert.ok(proj[0]!.amount > 0);
  const plan = planDebts(demo);
  assert.ok(plan.length > 0);
  const base = simulatePlan(plan, 0, 'avalanche', today);
  const extra = simulatePlan(plan, 500_000, 'avalanche', today);
  assert.ok(extra.months <= base.months && extra.totalInterest <= base.totalInterest);
});
