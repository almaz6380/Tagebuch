import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';

/** Lets the user pick an export file; resolves to its text, or null if cancelled. */
export async function pickBackupFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain'], copyToCacheDirectory: true });
  if (result.canceled) return null;
  return new File(result.assets[0].uri).text();
}
