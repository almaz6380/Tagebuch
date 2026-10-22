import { todayISO } from './dates';

/** Downloads the backup file. */
export async function exportBackup(json: string) {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tagebuch-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
