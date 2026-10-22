export type Entry = {
  id: string;
  /** Calendar day of the entry, YYYY-MM-DD. */
  date: string;
  title: string;
  body: string;
  /** 1–5, see `moods` in theme/themes.ts. */
  mood: number | null;
  tags: string[];
  /** Photo ids, see db/photos. */
  photos: string[];
  /** Set while the entry is in the trash. */
  deletedAt: number | null;
  createdAt: number;
  updatedAt: number;
};

/** Fills fields that older saved entries and backups don't have. */
export function normalizeEntry(e: Omit<Entry, 'photos' | 'deletedAt'> & Partial<Pick<Entry, 'photos' | 'deletedAt'>>): Entry {
  return { ...e, photos: e.photos ?? [], deletedAt: e.deletedAt ?? null };
}
