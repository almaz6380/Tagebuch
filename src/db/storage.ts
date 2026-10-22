import * as SQLite from 'expo-sqlite';

import type { Entry } from './types';

type Row = {
  id: string;
  date: string;
  title: string;
  body: string;
  mood: number | null;
  tags: string;
  photos: string;
  deleted_at: number | null;
  created_at: number;
  updated_at: number;
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function db() {
  dbPromise ??= SQLite.openDatabaseAsync('tagebuch.db').then(async (database) => {
    await database.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS entries (
        id TEXT PRIMARY KEY NOT NULL,
        date TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        mood INTEGER,
        tags TEXT NOT NULL DEFAULT '[]',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS entries_date ON entries(date);
    `);
    // Columns added after the first release.
    const columns = await database.getAllAsync<{ name: string }>('PRAGMA table_info(entries)');
    const has = (name: string) => columns.some((c) => c.name === name);
    if (!has('photos')) await database.execAsync(`ALTER TABLE entries ADD COLUMN photos TEXT NOT NULL DEFAULT '[]'`);
    if (!has('deleted_at')) await database.execAsync('ALTER TABLE entries ADD COLUMN deleted_at INTEGER');
    return database;
  });
  return dbPromise;
}

export async function loadAll(): Promise<Entry[]> {
  const rows = await (await db()).getAllAsync<Row>('SELECT * FROM entries');
  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    title: r.title,
    body: r.body,
    mood: r.mood,
    tags: JSON.parse(r.tags) as string[],
    photos: JSON.parse(r.photos) as string[],
    deletedAt: r.deleted_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function put(e: Entry): Promise<void> {
  await (await db()).runAsync(
    `INSERT OR REPLACE INTO entries (id, date, title, body, mood, tags, photos, deleted_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    e.id,
    e.date,
    e.title,
    e.body,
    e.mood,
    JSON.stringify(e.tags),
    JSON.stringify(e.photos),
    e.deletedAt,
    e.createdAt,
    e.updatedAt,
  );
}

export async function remove(id: string): Promise<void> {
  await (await db()).runAsync('DELETE FROM entries WHERE id = ?', id);
}
