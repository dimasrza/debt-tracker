export const BACKUP_APP = 'debt-tracker';
export const BACKUP_VERSION = 1;
export const COLLECTIONS = ['debts', 'installments', 'payments', 'paymentAllocations', 'categories'] as const;
export type CollectionName = (typeof COLLECTIONS)[number];

export interface BackupFile {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  data: Record<CollectionName, Record<string, unknown>[]>;
  settings: Record<string, unknown> | null;
}

export type ValidationResult = { ok: true; backup: BackupFile; counts: Record<CollectionName, number> } | { ok: false; errors: string[] };

const REQUIRED: Record<CollectionName, string[]> = {
  debts: ['id', 'name', 'principal', 'annualRatePct', 'termMonths', 'startDate'],
  installments: ['id', 'debtId', 'number', 'dueDate', 'principalDue', 'interestDue'],
  payments: ['id', 'debtId', 'date', 'amount'],
  paymentAllocations: ['id', 'installmentId'],
  categories: ['id', 'name'],
};

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export function createBackup(data: BackupFile['data'], settings: BackupFile['settings'], now = new Date()): BackupFile {
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), data, settings };
}

export function validateBackup(input: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isObj(input)) return { ok: false, errors: ['File is not a JSON object.'] };
  if (input.app !== BACKUP_APP) errors.push('Not a Debt Tracker backup (app field mismatch).');
  if (input.version !== BACKUP_VERSION) errors.push(`Unsupported backup version: ${String(input.version)}.`);
  if (!isObj(input.data)) {
    errors.push('Missing data section.');
    return { ok: false, errors };
  }
  const counts = {} as Record<CollectionName, number>;
  for (const c of COLLECTIONS) {
    const rows = input.data[c];
    if (!Array.isArray(rows)) {
      errors.push(`data.${c} must be an array.`);
      continue;
    }
    counts[c] = rows.length;
    const seen = new Set<string>();
    rows.forEach((row, idx) => {
      if (!isObj(row)) return void errors.push(`${c}[${idx}] is not an object.`);
      for (const f of REQUIRED[c]) if (row[f] === undefined || row[f] === null) errors.push(`${c}[${idx}] missing "${f}".`);
      if (typeof row.id === 'string') {
        if (row.id.includes('/')) errors.push(`${c}[${idx}] id contains "/".`);
        if (seen.has(row.id)) errors.push(`${c}[${idx}] duplicate id "${row.id}".`);
        seen.add(row.id);
      }
      for (const k of ['principal', 'amount', 'principalDue', 'interestDue']) {
        const v = row[k];
        if (v !== undefined && (!Number.isInteger(v) || (v as number) < 0)) errors.push(`${c}[${idx}].${k} must be a non-negative integer.`);
      }
    });
  }
  if (input.settings !== null && input.settings !== undefined && !isObj(input.settings)) errors.push('settings must be an object or null.');
  if (errors.length) return { ok: false, errors: errors.slice(0, 50) };
  return { ok: true, backup: input as unknown as BackupFile, counts };
}
