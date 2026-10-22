/** Unsaved editor state, kept so nothing is lost if the app is closed mid-sentence. */
export type DraftData = {
  date: string;
  title: string;
  body: string;
  mood: number | null;
  tags: string[];
  photos: string[];
  savedAt: number;
};
