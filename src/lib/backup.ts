import { useEffect, useState } from 'react';

import { readPhotoBase64 } from '@/db/photos';
import type { Entry } from '@/db/types';
import { getItem, setItem } from './kv';

const LAST_BACKUP_KEY = 'tagebuch.lastBackup';
/** Nudge the user to back up when the last export is older than this. */
export const BACKUP_INTERVAL_DAYS = 14;

export type Backup = { entries: Entry[]; photos: Record<string, string> };

/** Serializes entries plus their photos (base64 JPEG) into the backup file format. */
export async function buildBackup(entries: Entry[]): Promise<string> {
  const photos: Record<string, string> = {};
  for (const id of entries.flatMap((e) => e.photos)) {
    const data = await readPhotoBase64(id).catch(() => null);
    if (data) photos[id] = data;
  }
  return JSON.stringify({ app: 'tagebuch', version: 2, entries, photos }, null, 2);
}

/** Validate an export file; throws with a user-facing message. Accepts the old plain-array format too. */
export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Die Datei ist kein gültiges JSON.');
  }
  const obj = data as { entries?: unknown; photos?: unknown };
  const list = Array.isArray(data) ? data : obj && Array.isArray(obj.entries) ? obj.entries : null;
  if (!list) throw new Error('Die Datei enthält keine Tagebuch-Einträge.');

  const photos: Record<string, string> = {};
  if (obj && typeof obj.photos === 'object' && obj.photos && !Array.isArray(data)) {
    for (const [id, b64] of Object.entries(obj.photos as Record<string, unknown>)) {
      if (typeof b64 === 'string') photos[id] = b64;
    }
  }

  const entries = list.map((raw, i): Entry => {
    const e = raw as Partial<Entry>;
    if (typeof e?.id !== 'string' || typeof e.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) {
      throw new Error(`Eintrag ${i + 1} ist beschädigt.`);
    }
    const now = Date.now();
    const strings = (v: unknown) => (Array.isArray(v) ? v.filter((t): t is string => typeof t === 'string') : []);
    return {
      id: e.id,
      date: e.date,
      title: typeof e.title === 'string' ? e.title : '',
      body: typeof e.body === 'string' ? e.body : '',
      mood: typeof e.mood === 'number' && e.mood >= 1 && e.mood <= 5 ? e.mood : null,
      tags: strings(e.tags),
      // Only keep photos the file actually contains.
      photos: strings(e.photos).filter((id) => id in photos),
      deletedAt: null,
      createdAt: typeof e.createdAt === 'number' ? e.createdAt : now,
      updatedAt: typeof e.updatedAt === 'number' ? e.updatedAt : now,
    };
  });
  return { entries, photos };
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
