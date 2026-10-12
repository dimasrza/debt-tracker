export function addMonths(iso: string, months: number, dueDay?: number): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const total = m - 1 + months;
  const year = y + Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(dueDay ?? d, last);
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
