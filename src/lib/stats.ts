import type { Entry } from '@/db/types';
import type { Messages } from '@/i18n';
import { parseISODate, shiftDays, toISODate, todayISO } from './dates';

/** Consecutive days with an entry, ending today (or yesterday). */
export function currentStreak(entries: Entry[]) {
  const days = new Set(entries.map((e) => e.date));
  let day = todayISO();
  if (!days.has(day)) day = shiftDays(day, -1);
  let n = 0;
  while (days.has(day)) {
    n++;
    day = shiftDays(day, -1);
  }
  return n;
}

export function longestStreak(entries: Entry[]) {
  const days = [...new Set(entries.map((e) => e.date))].sort();
  let best = 0;
  let run = 0;
  let prev = '';
  for (const d of days) {
    run = prev && shiftDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

/** `yearsAgo` 0 means one month ago. */
export type Memory = { yearsAgo: number; entries: Entry[] };

export function memoryLabel(m: Memory, t: Messages) {
  return m.yearsAgo === 0 ? t.review.monthAgo : t.review.yearsAgo(m.yearsAgo);
}

/** Entries from one month ago and from the same day in earlier years, closest first. */
export function onThisDay(entries: Entry[], today = todayISO()): Memory[] {
  const out: Memory[] = [];
  const t = parseISODate(today);

  const monthAgo = new Date(t.getFullYear(), t.getMonth() - 1, t.getDate());
  // Skip when the day doesn't exist last month (e.g. 31st) and JS rolled over.
  if (monthAgo.getDate() === t.getDate()) {
    const iso = toISODate(monthAgo);
    const list = entries.filter((e) => e.date === iso);
    if (list.length) out.push({ yearsAgo: 0, entries: list });
  }

  const md = today.slice(5);
  const byYear = new Map<number, Entry[]>();
  for (const e of entries) {
    const year = Number(e.date.slice(0, 4));
    if (e.date.slice(5) === md && year < t.getFullYear()) byYear.set(year, [...(byYear.get(year) ?? []), e]);
  }
  for (const [year, list] of [...byYear].sort((a, b) => b[0] - a[0])) {
    out.push({ yearsAgo: t.getFullYear() - year, entries: list });
  }
  return out;
}

/** Average mood per day for the last `days` days (oldest first); null where nothing was rated. */
export function moodSeries(entries: Entry[], days = 30, today = todayISO()) {
  const sums = new Map<string, { sum: number; n: number }>();
  for (const e of entries) {
    if (e.mood == null) continue;
    const s = sums.get(e.date) ?? { sum: 0, n: 0 };
    sums.set(e.date, { sum: s.sum + e.mood, n: s.n + 1 });
  }
  return Array.from({ length: days }, (_, i) => {
    const date = shiftDays(today, i - days + 1);
    const s = sums.get(date);
    return { date, mood: s ? s.sum / s.n : null };
  });
}

export function topTags(entries: Entry[], limit = 6) {
  const counts = new Map<string, number>();
  for (const e of entries) for (const t of e.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'de')).slice(0, limit);
}

// Chinese and Japanese don't separate words with spaces; there each character counts.
const CJK = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/g;

export function wordCount(entries: Entry[]) {
  return entries.reduce((n, e) => {
    const cjk = e.body.match(CJK)?.length ?? 0;
    const words = e.body.replace(CJK, ' ').match(/\S+/g)?.length ?? 0;
    return n + cjk + words;
  }, 0);
}
