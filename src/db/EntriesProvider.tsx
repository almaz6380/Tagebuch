import * as Crypto from 'expo-crypto';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import * as storage from './storage';
import type { Entry } from './types';

type EntriesContextValue = {
  entries: Entry[];
  loaded: boolean;
  get: (id: string) => Entry | undefined;
  save: (entry: Omit<Entry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<Entry>;
  remove: (id: string) => Promise<void>;
  /** Merge a backup: new entries are added, existing ones only replaced if the backup is newer. */
  importEntries: (list: Entry[]) => Promise<{ added: number; updated: number; unchanged: number }>;
  allTags: string[];
};

const EntriesContext = createContext<EntriesContextValue | null>(null);

// Newest day first; within a day, newest entry first.
function sortEntries(list: Entry[]) {
  return [...list].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

export function EntriesProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    storage
      .loadAll()
      .then((list) => setEntries(sortEntries(list)))
      .catch((err) => console.error('Einträge konnten nicht geladen werden', err))
      .finally(() => setLoaded(true));
  }, []);

  const get = useCallback((id: string) => entries.find((e) => e.id === id), [entries]);

  const save = useCallback<EntriesContextValue['save']>(
    async (input) => {
      const now = Date.now();
      const existing = input.id ? entries.find((e) => e.id === input.id) : undefined;
      const entry: Entry = {
        ...input,
        id: existing?.id ?? Crypto.randomUUID(),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      await storage.put(entry);
      setEntries((prev) => sortEntries([...prev.filter((e) => e.id !== entry.id), entry]));
      return entry;
    },
    [entries],
  );

  const remove = useCallback(async (id: string) => {
    await storage.remove(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const importEntries = useCallback<EntriesContextValue['importEntries']>(
    async (list) => {
      const byId = new Map(entries.map((e) => [e.id, e]));
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
      if (changed.length) setEntries(sortEntries([...byId.values()]));
      return { added, updated, unchanged: list.length - changed.length };
    },
    [entries],
  );

  const allTags = useMemo(
    () => [...new Set(entries.flatMap((e) => e.tags))].sort((a, b) => a.localeCompare(b, 'de')),
    [entries],
  );

  const value = useMemo(
    () => ({ entries, loaded, get, save, remove, importEntries, allTags }),
    [entries, loaded, get, save, remove, importEntries, allTags],
  );

  return <EntriesContext.Provider value={value}>{children}</EntriesContext.Provider>;
}

export function useEntries() {
  const ctx = useContext(EntriesContext);
  if (!ctx) throw new Error('useEntries must be used inside EntriesProvider');
  return ctx;
}
