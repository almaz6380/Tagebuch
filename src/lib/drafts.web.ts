import type { DraftData } from './draftTypes';

const storageKey = (key: string) => `tagebuch.draft.${key}`;

export async function loadDraft(key: string): Promise<DraftData | null> {
  try {
    const raw = localStorage.getItem(storageKey(key));
    return raw ? (JSON.parse(raw) as DraftData) : null;
  } catch {
    return null;
  }
}

export async function saveDraft(key: string, draft: DraftData) {
  try {
    localStorage.setItem(storageKey(key), JSON.stringify(draft));
  } catch {
    // Storage full or blocked; the draft simply isn't kept.
  }
}

export async function clearDraft(key: string) {
  try {
    localStorage.removeItem(storageKey(key));
  } catch {
    // ignore
  }
}
