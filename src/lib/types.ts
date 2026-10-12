// All money values are integer rupiah. Dates are ISO strings (YYYY-MM-DD).
export type DebtType = 'pinjol' | 'paylater' | 'bank' | 'kartu_kredit' | 'cicilan_barang' | 'pribadi';
export type InterestMethod = 'annuity' | 'flat';

export interface Debt {
  id: string;
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
  remainingPrincipal: number;
  status: 'active' | 'paid';
}

export interface Installment {
  id: string;
  debtId: string;
  number: number;
  dueDate: string;
  principalDue: number;
  interestDue: number;
  feeDue: number;
  penaltyDue: number;
  paidPrincipal: number;
  paidInterest: number;
  paidFee: number;
  paidPenalty: number;
}

export interface Payment {
  id: string;
  debtId: string;
  date: string;
  amount: number;
  kind: 'partial' | 'full' | 'early_payoff';
  note?: string;
  /** early payoff only: original due amounts of waived future installments, so the payment can be undone */
  waived?: Record<string, { interestDue: number; feeDue: number; penaltyDue: number }>;
}

export interface Allocation {
  installmentId: string;
  penalty: number;
  fee: number;
  interest: number;
  principal: number;
}

export interface StoredAllocation extends Allocation {
  id: string;
  paymentId: string;
  debtId: string;
  date: string;
}
export interface Category { id: string; name: string }
export interface Settings { id: 'main'; lastBackupAt?: string }
export interface Data {
  debts: Debt[];
  installments: Installment[];
  payments: Payment[];
  paymentAllocations: StoredAllocation[];
  categories: Category[];
  settings: Settings;
}
