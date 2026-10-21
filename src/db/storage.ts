import * as SQLite from 'expo-sqlite';

import type { Entry } from './types';

type Row = {
  id: string;
  date: string;
  title: string;
  body: string;
  mood: number | null;
  tags: string;
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
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function put(e: Entry): Promise<void> {
  await (await db()).runAsync(
    `INSERT OR REPLACE INTO entries (id, date, title, body, mood, tags, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    e.id,
    e.date,
    e.title,
    e.body,
    e.mood,
    JSON.stringify(e.tags),
    e.createdAt,
    e.updatedAt,
  );
}

export async function remove(id: string): Promise<void> {
  await (await db()).runAsync('DELETE FROM entries WHERE id = ?', id);
}
