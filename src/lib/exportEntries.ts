import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { getMessages } from '@/i18n';
import { todayISO } from './dates';

/** Writes the backup file and opens the share sheet so it can be saved to Files/Drive. */
export async function exportBackup(json: string) {
  const file = new File(Paths.cache, `tagebuch-${todayISO()}.json`);
  if (file.exists) file.delete();
  file.create();
  await file.write(json);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: getMessages().backup.shareTitle });
}
