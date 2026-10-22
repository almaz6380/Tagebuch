// Shared IndexedDB connection for the web builds of storage and photos.
export const ENTRIES = 'entries';
export const PHOTOS = 'photos';

let dbPromise: Promise<IDBDatabase> | null = null;

function db() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open('tagebuch', 2);
    req.onupgradeneeded = () => {
      const database = req.result;
      if (!database.objectStoreNames.contains(ENTRIES)) database.createObjectStore(ENTRIES, { keyPath: 'id' });
      if (!database.objectStoreNames.contains(PHOTOS)) database.createObjectStore(PHOTOS);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) {
  const database = await db();
  return new Promise<T>((resolve, reject) => {
    const req = fn(database.transaction(store, mode).objectStore(store));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
