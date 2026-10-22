import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';

// JPEG files in the app's document folder, one per photo id.
const dir = new Directory(Paths.document, 'photos');

function fileFor(id: string) {
  if (!dir.exists) dir.create({ idempotent: true });
  return new File(dir, `${id}.jpg`);
}

/** Takes ownership of a (temporary) JPEG file and returns its new photo id. */
export async function addPhoto(uri: string): Promise<string> {
  const id = Crypto.randomUUID();
  await new File(uri).move(fileFor(id));
  return id;
}

export async function photoUri(id: string): Promise<string | null> {
  const file = fileFor(id);
  return file.exists ? file.uri : null;
}

export async function deletePhoto(id: string) {
  const file = fileFor(id);
  if (file.exists) file.delete();
}

export async function readPhotoBase64(id: string): Promise<string | null> {
  const file = fileFor(id);
  return file.exists ? file.base64() : null;
}

export async function writePhotoBase64(id: string, base64: string) {
  const file = fileFor(id);
  if (file.exists) return;
  file.create();
  await file.write(base64, { encoding: 'base64' });
}
