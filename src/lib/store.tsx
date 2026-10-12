'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Data, Debt, Payment, Settings } from './types.ts';
import { api, ApiError, loadConfig } from './api.ts';
import type { Op } from './api.ts';
import type { BackupFile } from './backup.ts';
import { addDebtOps, addPenaltyOps, applyOps, backupToData, deleteDebtOps, emptyData, listToData, makeDebt, payOps, undoPaymentOps, updateDebtOps, validateDebtInput } from './ops.ts';
import type { DebtInput } from './ops.ts';
import { buildDemo } from './demo.ts';
import { todayISO } from './format.ts';

export type Status = 'noconfig' | 'loading' | 'ready' | 'error';
export type Result = { ok: true } | { ok: false; error: string };

interface Store {
  data: Data;
  status: Status;
  error: string;
  demo: boolean;
  reload: () => Promise<void>;
  enterDemo: () => void;
  exitDemo: () => void;
  addDebt: (i: DebtInput) => Promise<Result>;
  updateDebt: (id: string, p: Pick<Debt, 'name' | 'lender' | 'type'>) => Promise<Result>;
  deleteDebt: (id: string) => Promise<Result>;
  pay: (debtId: string, amount: number, date: string, kind: Payment['kind'], note: string) => Promise<Result>;
  undoPayment: (id: string) => Promise<Result>;
  addPenalty: (installmentId: string, amount: number) => Promise<Result>;
  markBackup: () => Promise<void>;
  importBackup: (b: BackupFile, mode: 'merge' | 'replace') => Promise<Result>;
}

const Ctx = createContext<Store | null>(null);
export const useData = (): Store => {
  const v = useContext(Ctx);
  if (!v) throw new Error('DataProvider missing');
  return v;
};

const CHUNK = 400; // Apps Script accepts up to 500 operations per call

const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Terjadi kesalahan.');

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [real, setReal] = useState<Data>(emptyData());
  const [demoData, setDemoData] = useState<Data | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!loadConfig()) {
      setStatus('noconfig');
      return;
    }
    setStatus('loading');
    try {
      const r = await api.list();
      setReal(listToData(r.data));
      setError('');
      setStatus('ready');
    } catch (e) {
      setError(errMsg(e));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const commit = useCallback(
    async (ops: Op[]): Promise<Result> => {
      if (ops.length === 0) return { ok: true };
      if (demoData) {
        setDemoData((d) => applyOps(d ?? emptyData(), ops));
        return { ok: true };
      }
      try {
        for (let i = 0; i < ops.length; i += CHUNK) {
          const part = ops.slice(i, i + CHUNK);
          await api.batch(part);
          setReal((d) => applyOps(d, part));
        }
        return { ok: true };
      } catch (e) {
        return { ok: false, error: errMsg(e) };
      }
    },
    [demoData],
  );

  const data = demoData ?? real;

  const store = useMemo<Store>(() => {
    const run = (r: { ops: Op[]; error?: string }) => (r.error ? Promise.resolve<Result>({ ok: false, error: r.error }) : commit(r.ops));
    return {
      data,
      status: demoData ? 'ready' : status,
      error,
      demo: demoData !== null,
      reload,
      enterDemo: () => setDemoData(buildDemo(todayISO())),
      exitDemo: () => setDemoData(null),
      addDebt: (i) => {
        const e = validateDebtInput(i);
        return e ? Promise.resolve({ ok: false, error: e }) : commit(addDebtOps(makeDebt(i)));
      },
      updateDebt: (id, p) => run(updateDebtOps(data, id, p)),
      deleteDebt: (id) => commit(deleteDebtOps(data, id)),
      pay: (debtId, amount, date, kind, note) => run(payOps(data, debtId, amount, date, kind, note)),
      undoPayment: (id) => run(undoPaymentOps(data, id)),
      addPenalty: (iid, amount) => run(addPenaltyOps(data, iid, amount)),
      markBackup: async () => {
        if (demoData) return;
        const settings: Settings = { ...data.settings, id: 'main', lastBackupAt: new Date().toISOString() };
        await commit([{ op: 'put', collection: 'settings', doc: settings }]);
      },
      importBackup: async (b, mode) => {
        if (demoData) return { ok: false, error: 'Keluar dari mode demo sebelum mengimpor.' };
        const incoming = backupToData(b);
        if (mode === 'replace') {
          try {
            await api.replaceAll({
              debts: incoming.debts, installments: incoming.installments, payments: incoming.payments,
              paymentAllocations: incoming.paymentAllocations, categories: incoming.categories, settings: [incoming.settings],
            });
            setReal(incoming);
            return { ok: true };
          } catch (e) {
            return { ok: false, error: errMsg(e) };
          }
        }
        const ops: Op[] = [
          ...incoming.debts.map((doc): Op => ({ op: 'put', collection: 'debts', doc })),
          ...incoming.installments.map((doc): Op => ({ op: 'put', collection: 'installments', doc })),
          ...incoming.payments.map((doc): Op => ({ op: 'put', collection: 'payments', doc })),
          ...incoming.paymentAllocations.map((doc): Op => ({ op: 'put', collection: 'paymentAllocations', doc })),
          ...incoming.categories.map((doc): Op => ({ op: 'put', collection: 'categories', doc })),
        ];
        return commit(ops);
      },
    };
  }, [data, demoData, status, error, reload, commit]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
