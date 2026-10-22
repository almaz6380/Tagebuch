import { useEffect, useState } from 'react';

import type { Entry } from '@/db/types';
import { getItem, setItem } from './kv';

const LAST_BACKUP_KEY = 'tagebuch.lastBackup';
/** Nudge the user to back up when the last export is older than this. */
export const BACKUP_INTERVAL_DAYS = 14;

/** Validate a parsed export file; throws with a user-facing message. */
export function parseBackup(text: string): Entry[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Die Datei ist kein gültiges JSON.');
  }
  if (!Array.isArray(data)) throw new Error('Die Datei enthält keine Tagebuch-Einträge.');
  return data.map((raw, i) => {
    const e = raw as Partial<Entry>;
    if (typeof e?.id !== 'string' || typeof e.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) {
      throw new Error(`Eintrag ${i + 1} ist beschädigt.`);
    }
    const now = Date.now();
    return {
      id: e.id,
      date: e.date,
      title: typeof e.title === 'string' ? e.title : '',
      body: typeof e.body === 'string' ? e.body : '',
      mood: typeof e.mood === 'number' && e.mood >= 1 && e.mood <= 5 ? e.mood : null,
      tags: Array.isArray(e.tags) ? e.tags.filter((t): t is string => typeof t === 'string') : [],
      createdAt: typeof e.createdAt === 'number' ? e.createdAt : now,
      updatedAt: typeof e.updatedAt === 'number' ? e.updatedAt : now,
    };
  });
}

// Shared across screens so the reminder card and settings update together.
let lastBackup: number | null | undefined;
const listeners = new Set<(v: number | null) => void>();

export async function markBackedUp() {
  lastBackup = Date.now();
  await setItem(LAST_BACKUP_KEY, String(lastBackup));
  listeners.forEach((l) => l(lastBackup!));
}

/** Timestamp of the last export; `undefined` while loading, `null` if never. */
export function useLastBackup() {
  const [value, setValue] = useState(lastBackup);
  useEffect(() => {
    listeners.add(setValue);
    if (lastBackup === undefined) {
      getItem(LAST_BACKUP_KEY).then((v) => {
        lastBackup = v ? Number(v) : null;
        listeners.forEach((l) => l(lastBackup!));
      });
    }
    return () => {
      listeners.delete(setValue);
    };
  }, []);
  return value;
}

export function daysSince(ts: number) {
  return Math.floor((Date.now() - ts) / 86_400_000);
}
