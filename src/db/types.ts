export type Entry = {
  id: string;
  /** Calendar day of the entry, YYYY-MM-DD. */
  date: string;
  title: string;
  body: string;
  /** 1–5, see `moods` in theme/themes.ts. */
  mood: number | null;
  tags: string[];
  createdAt: number;
  updatedAt: number;
};
