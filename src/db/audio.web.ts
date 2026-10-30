import * as Crypto from 'expo-crypto';

import { AUDIO, run } from './idb';

// Voice notes as blobs in IndexedDB (only from restored backups; the browser
// version can't record). Object URLs are cached for the lifetime of the page.
const urls = new Map<string, string>();

export async function addAudio(uri: string): Promise<string> {
  const id = Crypto.randomUUID();
  const blob = await (await fetch(uri)).blob();
  await run(AUDIO, 'readwrite', (s) => s.put(blob, id));
  return id;
}

export async function audioUri(id: string): Promise<string | null> {
  const cached = urls.get(id);
  if (cached) return cached;
  const blob = await run<Blob | undefined>(AUDIO, 'readonly', (s) => s.get(id));
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urls.set(id, url);
  return url;
}

export async function deleteAudio(id: string) {
  await run(AUDIO, 'readwrite', (s) => s.delete(id));
  const url = urls.get(id);
  if (url) URL.revokeObjectURL(url);
  urls.delete(id);
}

export async function readAudioBase64(id: string): Promise<string | null> {
  const blob = await run<Blob | undefined>(AUDIO, 'readonly', (s) => s.get(id));
  if (!blob) return null;
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  return dataUrl.slice(dataUrl.indexOf(',') + 1);
}

export async function writeAudioBase64(id: string, base64: string) {
  const exists = await run<number>(AUDIO, 'readonly', (s) => s.count(id));
  if (exists) return;
  const blob = await (await fetch(`data:audio/mp4;base64,${base64}`)).blob();
  await run(AUDIO, 'readwrite', (s) => s.put(blob, id));
}
