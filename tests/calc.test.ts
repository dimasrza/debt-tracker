import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSchedule } from '../src/lib/calc/schedule.ts';
import { allocatePayment, installmentStatus, payoffAmount, summarize } from '../src/lib/calc/payments.ts';
import { simulatePlan } from '../src/lib/calc/strategy.ts';
import { addMonths } from '../src/lib/calc/dates.ts';
import { validateBackup, createBackup, COLLECTIONS } from '../src/lib/backup.ts';
import { toCsv } from '../src/lib/csv.ts';

const base = { debtId: 'd1', startDate: '2026-01-31', dueDay: 31, monthlyFee: 0 };

test('addMonths clamps to month end', () => {
  assert.equal(addMonths('2026-01-31', 1, 31), '2026-02-28');
  assert.equal(addMonths('2026-11-15', 3), '2027-02-15');
});

test('annuity schedule: principal sums exactly, balance ends at zero', () => {
  const s = buildSchedule({ ...base, principal: 10_000_000, annualRatePct: 12, termMonths: 12, method: 'annuity' });
  assert.equal(s.length, 12);
  assert.equal(s.reduce((a, i) => a + i.principalDue, 0), 10_000_000);
  const pay = s[0]!.principalDue + s[0]!.interestDue;
  assert.ok(Math.abs(pay - 888_488) <= 1); // standard annuity payment
});

test('flat schedule: equal interest, principal sums exactly', () => {
  const s = buildSchedule({ ...base, principal: 1_000_000, annualRatePct: 24, termMonths: 6, method: 'flat' });
  assert.equal(s.reduce((a, i) => a + i.principalDue, 0), 1_000_000);
  assert.equal(s.reduce((a, i) => a + i.interestDue, 0), 120_000);
});

test('zero-interest schedule', () => {
  const s = buildSchedule({ ...base, principal: 1_000_000, annualRatePct: 0, termMonths: 3, method: 'annuity' });
  assert.equal(s.reduce((a, i) => a + i.interestDue, 0), 0);
  assert.equal(s.reduce((a, i) => a + i.principalDue, 0), 1_000_000);
});

test('allocation order: oldest first, penalty > fee > interest > principal', () => {
  const s = buildSchedule({ ...base, principal: 1_200_000, annualRatePct: 12, termMonths: 3, method: 'flat', monthlyFee: 10_000 });
  s[0]!.penaltyDue = 5_000;
  const first = s[0]!;
  const { allocations, unallocated } = allocatePayment(s, 100_000);
  assert.equal(unallocated, 0);
  assert.equal(allocations.length, 1);
  const a = allocations[0]!;
  assert.equal(a.installmentId, first.id);
  assert.equal(a.penalty, 5_000);
  assert.equal(a.fee, 10_000);
  assert.equal(a.interest, first.interestDue);
  assert.equal(a.penalty + a.fee + a.interest + a.principal, 100_000);
});

test('overpayment is reported, never lost', () => {
  const s = buildSchedule({ ...base, principal: 300_000, annualRatePct: 0, termMonths: 3, method: 'flat' });
  const { allocations, unallocated } = allocatePayment(s, 1_000_000);
  assert.equal(unallocated, 700_000);
  assert.equal(allocations.reduce((a, x) => a + x.principal, 0), 300_000);
});

test('status, summary and payoff', () => {
  const s = buildSchedule({ ...base, principal: 300_000, annualRatePct: 0, termMonths: 3, method: 'flat' });
  assert.equal(installmentStatus(s[0]!, '2026-02-01'), 'upcoming');
  assert.equal(installmentStatus(s[0]!, '2026-03-01'), 'overdue');
  const sum = summarize(s, '2026-03-15');
  assert.equal(sum.overdueCount, 1);
  assert.equal(sum.remainingPrincipal, 300_000);
  assert.equal(payoffAmount(s, '2026-03-15'), 300_000);
});

test('payoff excludes future interest', () => {
  const s = buildSchedule({ ...base, principal: 1_200_000, annualRatePct: 12, termMonths: 12, method: 'flat' });
  assert.equal(payoffAmount(s, '2026-01-01'), 1_200_000);
});

test('snowball vs avalanche', () => {
  const debts = [
    { id: 'a', name: 'Small low rate', balance: 1_000_000, annualRatePct: 5, minPayment: 100_000 },
    { id: 'b', name: 'Big high rate', balance: 5_000_000, annualRatePct: 36, minPayment: 200_000 },
  ];
  const sn = simulatePlan(debts, 300_000, 'snowball', '2026-10-12');
  const av = simulatePlan(debts, 300_000, 'avalanche', '2026-10-12');
  assert.equal(sn.order[0], 'a');
  assert.ok(sn.converged && av.converged);
  assert.ok(av.totalInterest <= sn.totalInterest);
  assert.ok(sn.freeDate !== null);
});

test('plan that never pays off is flagged', () => {
  const r = simulatePlan([{ id: 'x', name: 'x', balance: 10_000_000, annualRatePct: 60, minPayment: 100_000 }], 0, 'avalanche', '2026-10-12', 120);
  assert.equal(r.converged, false);
  assert.equal(r.freeDate, null);
});

test('backup validation', () => {
  const empty = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as never;
  const ok = validateBackup(JSON.parse(JSON.stringify(createBackup(empty, null))));
  assert.equal(ok.ok, true);
  assert.equal(validateBackup({ app: 'other' }).ok, false);
  const bad = createBackup(empty, null) as unknown as { data: { debts: unknown[] } };
  bad.data.debts.push({ id: 'a/b', name: 'x', principal: -5, annualRatePct: 1, termMonths: 1, startDate: '2026-01-01' });
  const r = validateBackup(bad);
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.errors.length >= 2);
});

test('csv escapes quotes, commas and formulas', () => {
  const out = toCsv([{ a: 'x,"y"', b: '=SUM(A1)', c: 5 }], ['a', 'b', 'c']);
  assert.equal(out, `a,b,c\r\n"x,""y""",'=SUM(A1),5`);
});
