import * as Crypto from 'expo-crypto';

import { PHOTOS, run } from './idb';

// JPEG blobs in IndexedDB; object URLs are cached for the lifetime of the page.
const urls = new Map<string, string>();

export async function addPhoto(uri: string): Promise<string> {
  const id = Crypto.randomUUID();
  const blob = await (await fetch(uri)).blob();
  await run(PHOTOS, 'readwrite', (s) => s.put(blob, id));
  return id;
}

export async function photoUri(id: string): Promise<string | null> {
  const cached = urls.get(id);
  if (cached) return cached;
  const blob = await run<Blob | undefined>(PHOTOS, 'readonly', (s) => s.get(id));
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urls.set(id, url);
  return url;
}

export async function deletePhoto(id: string) {
  await run(PHOTOS, 'readwrite', (s) => s.delete(id));
  const url = urls.get(id);
  if (url) URL.revokeObjectURL(url);
  urls.delete(id);
}

export async function readPhotoBase64(id: string): Promise<string | null> {
  const blob = await run<Blob | undefined>(PHOTOS, 'readonly', (s) => s.get(id));
  if (!blob) return null;
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  return dataUrl.slice(dataUrl.indexOf(',') + 1);
}

export async function writePhotoBase64(id: string, base64: string) {
  const exists = await run<number>(PHOTOS, 'readonly', (s) => s.count(id));
  if (exists) return;
  const blob = await (await fetch(`data:image/jpeg;base64,${base64}`)).blob();
  await run(PHOTOS, 'readwrite', (s) => s.put(blob, id));
}
