// IndexedDB on web: expo-sqlite's web build needs COOP/COEP headers, which
// plain static hosts (GitHub Pages, Netlify defaults) don't send.
import type { Entry } from './types';

const DB_NAME = 'tagebuch';
const STORE = 'entries';

let dbPromise: Promise<IDBDatabase> | null = null;

function db() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await db();
  return new Promise<T>((resolve, reject) => {
    const req = fn(database.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadAll(): Promise<Entry[]> {
  if (typeof indexedDB === 'undefined') return []; // static rendering on the server
  return run<Entry[]>('readonly', (s) => s.getAll());
}

export async function put(e: Entry): Promise<void> {
  await run('readwrite', (s) => s.put(e));
}

export async function remove(id: string): Promise<void> {
  await run('readwrite', (s) => s.delete(id));
}
