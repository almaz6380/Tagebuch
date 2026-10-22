import type { Entry } from '@/db/types';
import { todayISO } from './dates';

export async function exportEntries(entries: Entry[]) {
  const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tagebuch-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
