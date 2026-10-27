import { getMessages } from '@/i18n';

// All names come from Intl in the active app language.
const locale = () => getMessages().locale;

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO() {
  return toISODate(new Date());
}

export function parseISODate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function shiftDays(iso: string, days: number) {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** "Dienstag, 21. Oktober 2026" / "Tuesday, October 21, 2026" */
export function formatLong(iso: string) {
  return parseISODate(iso).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/** Same without the year, for compact headers. */
export function formatLongNoYear(iso: string) {
  return parseISODate(iso).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' });
}

/** "21. Okt." / "Oct 21" */
export function formatShort(iso: string) {
  return parseISODate(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'short' });
}

export function formatMonthYear(iso: string) {
  return parseISODate(iso).toLocaleDateString(locale(), { month: 'long', year: 'numeric' });
}

export function weekdayShort(iso: string) {
  return parseISODate(iso).toLocaleDateString(locale(), { weekday: 'short' });
}

/** Monday-first short weekday names. */
export function weekdaysShort() {
  // 1 January 2024 was a Monday.
  return Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale(), { weekday: 'short' }));
}

export function formatNumber(n: number) {
  return n.toLocaleString(locale());
}

/** Monday-first grid of ISO dates (null for padding cells). */
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= days; d++) cells.push(toISODate(new Date(year, month, d)));
  while (cells.length % 7) cells.push(null);
  return cells;
}

/** "20:00" / "8:00 PM" */
export function formatTime(hour: number, minute: number) {
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit' });
}
