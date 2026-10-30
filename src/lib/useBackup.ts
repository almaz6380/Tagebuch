import { useCallback } from 'react';

import { useEntries } from '@/db/EntriesProvider';
import { writeAudioBase64 } from '@/db/audio';
import { writePhotoBase64 } from '@/db/photos';
import { getMessages } from '@/i18n';
import { buildBackup, markBackedUp, parseBackup } from './backup';
import { notify } from './confirm';
import { exportBackup } from './exportEntries';
import { pickBackupFile } from './pickBackupFile';

/** Export and restore actions with user-facing feedback. */
export function useBackup() {
  const { entries, importEntries } = useEntries();

  const backup = useCallback(async () => {
    const t = getMessages().backup;
    try {
      await exportBackup(await buildBackup(entries));
      await markBackedUp();
    } catch (err) {
      console.error('Export fehlgeschlagen', err);
      notify(t.exportFailedTitle, t.exportFailedBody);
    }
  }, [entries]);

  const restore = useCallback(async () => {
    const t = getMessages().backup;
    let text: string | null;
    try {
      text = await pickBackupFile();
    } catch (err) {
      console.error('Datei konnte nicht gelesen werden', err);
      notify(t.importFailedTitle, t.readFailed);
      return;
    }
    if (text == null) return;
    try {
      const backup = parseBackup(text);
      for (const [id, data] of Object.entries(backup.photos)) await writePhotoBase64(id, data);
      for (const [id, data] of Object.entries(backup.audio)) await writeAudioBase64(id, data);
      const { added, updated, unchanged } = await importEntries(backup.entries);
      notify(t.importDoneTitle, t.importDone(added, updated, unchanged));
    } catch (err) {
      notify(t.importFailedTitle, err instanceof Error ? err.message : t.unknownError);
    }
  }, [importEntries]);

  return { backup, restore };
}
