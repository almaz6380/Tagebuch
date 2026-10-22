import { File, Paths } from 'expo-file-system';

import type { DraftData } from './draftTypes';

// One JSON file per draft; SecureStore (kv) is too small for long texts.
const fileFor = (key: string) => new File(Paths.document, `draft-${key}.json`);

export async function loadDraft(key: string): Promise<DraftData | null> {
  const file = fileFor(key);
  if (!file.exists) return null;
  try {
    return JSON.parse(await file.text()) as DraftData;
  } catch {
    return null;
  }
}

export async function saveDraft(key: string, draft: DraftData) {
  const file = fileFor(key);
  if (!file.exists) file.create();
  await file.write(JSON.stringify(draft));
}

export async function clearDraft(key: string) {
  const file = fileFor(key);
  if (file.exists) file.delete();
}
