import * as Crypto from 'expo-crypto';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { deletePhoto } from './photos';
import * as storage from './storage';
import type { Entry } from './types';

/** Entries stay in the trash this long before they are deleted for good. */
export const TRASH_DAYS = 30;
const TRASH_MS = TRASH_DAYS * 86_400_000;

type EntryInput = Omit<Entry, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> & { id?: string };

type EntriesContextValue = {
  /** Active entries (not in the trash). */
  entries: Entry[];
  /** Entries in the trash, most recently deleted first. */
  trash: Entry[];
  loaded: boolean;
  get: (id: string) => Entry | undefined;
  save: (entry: EntryInput) => Promise<Entry>;
  /** Moves an entry to the trash. */
  remove: (id: string) => Promise<void>;
  restore: (id: string) => Promise<void>;
  /** Deletes an entry and its photos for good. */
  purge: (id: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
  /** Merge a backup: new entries are added, existing ones only replaced if the backup is newer. */
  importEntries: (list: Entry[]) => Promise<{ added: number; updated: number; unchanged: number }>;
  allTags: string[];
};

const EntriesContext = createContext<EntriesContextValue | null>(null);

// Newest day first; within a day, newest entry first.
function sortEntries(list: Entry[]) {
  return [...list].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

async function deleteForGood(e: Entry) {
  await storage.remove(e.id);
  await Promise.all(e.photos.map((p) => deletePhoto(p).catch(() => {})));
}

export function EntriesProvider({ children }: { children: ReactNode }) {
  const [all, setAll] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const list = await storage.loadAll();
      const expired = list.filter((e) => e.deletedAt != null && Date.now() - e.deletedAt > TRASH_MS);
      for (const e of expired) await deleteForGood(e);
      setAll(sortEntries(list.filter((e) => !expired.includes(e))));
    })()
      .catch((err) => console.error('Could not load entries', err))
      .finally(() => setLoaded(true));
  }, []);

  const entries = useMemo(() => all.filter((e) => e.deletedAt == null), [all]);
  const trash = useMemo(
    () => all.filter((e) => e.deletedAt != null).sort((a, b) => b.deletedAt! - a.deletedAt!),
    [all],
  );

  const get = useCallback((id: string) => entries.find((e) => e.id === id), [entries]);

  const write = useCallback(async (entry: Entry) => {
    await storage.put(entry);
    setAll((prev) => sortEntries([...prev.filter((e) => e.id !== entry.id), entry]));
  }, []);

  const save = useCallback<EntriesContextValue['save']>(
    async (input) => {
      const now = Date.now();
      const existing = input.id ? all.find((e) => e.id === input.id) : undefined;
      const entry: Entry = {
        ...input,
        id: existing?.id ?? Crypto.randomUUID(),
        deletedAt: null,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      await write(entry);
      // Photos removed in the editor are no longer referenced anywhere.
      const dropped = existing?.photos.filter((p) => !entry.photos.includes(p)) ?? [];
      await Promise.all(dropped.map((p) => deletePhoto(p).catch(() => {})));
      return entry;
    },
    [all, write],
  );

  const setDeleted = useCallback(
    async (id: string, deletedAt: number | null) => {
      const e = all.find((x) => x.id === id);
      if (e) await write({ ...e, deletedAt });
    },
    [all, write],
  );

  const remove = useCallback((id: string) => setDeleted(id, Date.now()), [setDeleted]);
  const restore = useCallback((id: string) => setDeleted(id, null), [setDeleted]);

  const purge = useCallback(
    async (id: string) => {
      const e = all.find((x) => x.id === id);
      if (!e) return;
      await deleteForGood(e);
      setAll((prev) => prev.filter((x) => x.id !== id));
    },
    [all],
  );

  const emptyTrash = useCallback(async () => {
    const gone = all.filter((e) => e.deletedAt != null);
    for (const e of gone) await deleteForGood(e);
    setAll((prev) => prev.filter((e) => e.deletedAt == null));
  }, [all]);

  const importEntries = useCallback<EntriesContextValue['importEntries']>(
    async (list) => {
      const byId = new Map(all.map((e) => [e.id, e]));
      const changed: Entry[] = [];
      let added = 0;
      let updated = 0;
      for (const e of list) {
        const existing = byId.get(e.id);
        if (existing && existing.updatedAt >= e.updatedAt) continue;
        if (existing) updated++;
        else added++;
        byId.set(e.id, e);
        changed.push(e);
      }
      for (const e of changed) await storage.put(e);
      if (changed.length) setAll(sortEntries([...byId.values()]));
      return { added, updated, unchanged: list.length - changed.length };
    },
    [all],
  );

  const allTags = useMemo(
    () => [...new Set(entries.flatMap((e) => e.tags))].sort((a, b) => a.localeCompare(b, 'de')),
    [entries],
  );

  const value = useMemo(
    () => ({ entries, trash, loaded, get, save, remove, restore, purge, emptyTrash, importEntries, allTags }),
    [entries, trash, loaded, get, save, remove, restore, purge, emptyTrash, importEntries, allTags],
  );

  return <EntriesContext.Provider value={value}>{children}</EntriesContext.Provider>;
}

export function useEntries() {
  const ctx = useContext(EntriesContext);
  if (!ctx) throw new Error('useEntries must be used inside EntriesProvider');
  return ctx;
}
