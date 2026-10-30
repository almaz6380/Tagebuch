import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';

// Voice notes as .m4a files in the app's document folder, one per clip id.
const dir = new Directory(Paths.document, 'audio');

function fileFor(id: string) {
  if (!dir.exists) dir.create({ idempotent: true });
  return new File(dir, `${id}.m4a`);
}

/** Takes ownership of a finished recording and returns its new clip id. */
export async function addAudio(uri: string): Promise<string> {
  const id = Crypto.randomUUID();
  await new File(uri).move(fileFor(id));
  return id;
}

export async function audioUri(id: string): Promise<string | null> {
  const file = fileFor(id);
  return file.exists ? file.uri : null;
}

export async function deleteAudio(id: string) {
  const file = fileFor(id);
  if (file.exists) file.delete();
}

export async function readAudioBase64(id: string): Promise<string | null> {
  const file = fileFor(id);
  return file.exists ? file.base64() : null;
}

export async function writeAudioBase64(id: string, base64: string) {
  const file = fileFor(id);
  if (file.exists) return;
  file.create();
  await file.write(base64, { encoding: 'base64' });
}
