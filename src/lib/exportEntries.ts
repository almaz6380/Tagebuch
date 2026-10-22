import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { Entry } from '@/db/types';
import { todayISO } from './dates';

/** Writes a JSON file and opens the share sheet so it can be saved to Files/Drive. */
export async function exportEntries(entries: Entry[]) {
  const file = new File(Paths.cache, `tagebuch-${todayISO()}.json`);
  if (file.exists) file.delete();
  file.create();
  await file.write(JSON.stringify(entries, null, 2));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Tagebuch sichern' });
}
