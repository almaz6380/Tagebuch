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

/** Average mood per day of one year, keyed by ISO date. */
export function moodByDay(entries: Entry[], year: number) {
  const sums = new Map<string, { sum: number; n: number }>();
  const prefix = `${year}-`;
  for (const e of entries) {
    if (e.mood == null || !e.date.startsWith(prefix)) continue;
    const s = sums.get(e.date) ?? { sum: 0, n: 0 };
    sums.set(e.date, { sum: s.sum + e.mood, n: s.n + 1 });
  }
  return new Map([...sums].map(([date, s]) => [date, s.sum / s.n]));
}

export type MoodPatterns = {
  /** Weekday index, Monday = 0. */
  bestDay: number;
  worstDay: number;
  /** Tags whose entries have the highest average mood (at least 3 uses). */
  happyTags: string[];
  /** How many rated days had mood 1–5 (index 0 = mood 1). */
  distribution: number[];
};

/** Patterns across all rated entries; null until at least 7 days are rated. */
export function moodPatterns(entries: Entry[]): MoodPatterns | null {
  const rated = entries.filter((e) => e.mood != null);
  if (new Set(rated.map((e) => e.date)).size < 7) return null;

  const byDay = Array.from({ length: 7 }, () => ({ sum: 0, n: 0 }));
  const distribution = [0, 0, 0, 0, 0];
  const tags = new Map<string, { sum: number; n: number }>();
  for (const e of rated) {
    const [y, m, d] = e.date.split('-').map(Number);
    const weekday = (new Date(y, m - 1, d).getDay() + 6) % 7;
    byDay[weekday].sum += e.mood!;
    byDay[weekday].n++;
    distribution[e.mood! - 1]++;
    for (const t of e.tags) {
      const s = tags.get(t) ?? { sum: 0, n: 0 };
      tags.set(t, { sum: s.sum + e.mood!, n: s.n + 1 });
    }
  }
  const averages = byDay.map((d, i) => ({ i, avg: d.n ? d.sum / d.n : null }));
  const known = averages.filter((d) => d.avg != null) as { i: number; avg: number }[];
  known.sort((a, b) => b.avg - a.avg);
  const happyTags = [...tags]
    .filter(([, s]) => s.n >= 3 && s.sum / s.n >= 3.5)
    .sort((a, b) => b[1].sum / b[1].n - a[1].sum / a[1].n || b[1].n - a[1].n)
    .slice(0, 5)
    .map(([t]) => t);
  return { bestDay: known[0].i, worstDay: known[known.length - 1].i, happyTags, distribution };
}
