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
  /** Voice notes, see db/audio. */
  audio: AudioClip[];
  /** Time capsule: hidden until this day (YYYY-MM-DD), null for a normal entry. */
  sealedUntil: string | null;
  /** Set while the entry is in the trash. */
  deletedAt: number | null;
  createdAt: number;
  updatedAt: number;
};

export type AudioClip = { id: string; ms: number };

type Optional = 'photos' | 'deletedAt' | 'audio' | 'sealedUntil';

/** Fills fields that older saved entries and backups don't have. */
export function normalizeEntry(e: Omit<Entry, Optional> & Partial<Pick<Entry, Optional>>): Entry {
  return { ...e, photos: e.photos ?? [], deletedAt: e.deletedAt ?? null, audio: e.audio ?? [], sealedUntil: e.sealedUntil ?? null };
}

/** True while a time capsule is still closed. */
export function isSealed(e: Pick<Entry, 'sealedUntil'>, today: string): boolean {
  return e.sealedUntil != null && e.sealedUntil > today;
}
