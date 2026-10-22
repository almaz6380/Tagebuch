import { useCallback } from 'react';

import { useEntries } from '@/db/EntriesProvider';
import { writePhotoBase64 } from '@/db/photos';
import { buildBackup, markBackedUp, parseBackup } from './backup';
import { notify } from './confirm';
import { exportBackup } from './exportEntries';
import { pickBackupFile } from './pickBackupFile';

/** Export and restore actions with user-facing feedback. */
export function useBackup() {
  const { entries, importEntries } = useEntries();

  const backup = useCallback(async () => {
    try {
      await exportBackup(await buildBackup(entries));
      await markBackedUp();
    } catch (err) {
      console.error('Export fehlgeschlagen', err);
      notify('Export fehlgeschlagen', 'Die Sicherung konnte nicht erstellt werden. Bitte versuch es nochmal.');
    }
  }, [entries]);

  const restore = useCallback(async () => {
    let text: string | null;
    try {
      text = await pickBackupFile();
    } catch (err) {
      console.error('Datei konnte nicht gelesen werden', err);
      notify('Import fehlgeschlagen', 'Die Datei konnte nicht gelesen werden.');
      return;
    }
    if (text == null) return;
    try {
      const backup = parseBackup(text);
      for (const [id, data] of Object.entries(backup.photos)) await writePhotoBase64(id, data);
      const { added, updated, unchanged } = await importEntries(backup.entries);
      const parts = [`${added} neu`, `${updated} aktualisiert`];
      if (unchanged) parts.push(`${unchanged} schon vorhanden`);
      notify('Import abgeschlossen', `Einträge: ${parts.join(', ')}.`);
    } catch (err) {
      notify('Import fehlgeschlagen', err instanceof Error ? err.message : 'Unbekannter Fehler.');
    }
  }, [importEntries]);

  return { backup, restore };
}
