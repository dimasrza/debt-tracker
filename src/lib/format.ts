export const rupiah = (n: number): string =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export const dateID = (iso: string): string =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

export const monthID = (iso: string): string =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

export function todayISO(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const uid = (prefix: string): string => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const DEBT_TYPES = [
  ['pinjol', 'Pinjol'],
  ['paylater', 'Paylater'],
  ['bank', 'Bank'],
  ['kartu_kredit', 'Kartu kredit'],
  ['cicilan_barang', 'Cicilan barang'],
  ['pribadi', 'Pinjaman pribadi'],
] as const;

export const typeLabel = (t: string): string => DEBT_TYPES.find(([k]) => k === t)?.[1] ?? t;
