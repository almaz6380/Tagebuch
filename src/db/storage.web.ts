// IndexedDB on web: expo-sqlite's web build needs COOP/COEP headers, which
// plain static hosts (GitHub Pages, Netlify defaults) don't send.
import { ENTRIES, run } from './idb';
import { normalizeEntry, type Entry } from './types';

export async function loadAll(): Promise<Entry[]> {
  if (typeof indexedDB === 'undefined') return []; // static rendering on the server
  return (await run<Entry[]>(ENTRIES, 'readonly', (s) => s.getAll())).map(normalizeEntry);
}

export async function put(e: Entry): Promise<void> {
  await run(ENTRIES, 'readwrite', (s) => s.put(e));
}

export async function remove(id: string): Promise<void> {
  await run(ENTRIES, 'readwrite', (s) => s.delete(id));
}
