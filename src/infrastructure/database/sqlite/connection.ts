import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import type { Database as DatabaseType } from '@/domain/db';
import type { Database as BetterSqlite3Database } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let dbInstance: Kysely<DatabaseType> | null = null;
let sqliteInstance: BetterSqlite3Database | null = null;

export function getDatabase(): Kysely<DatabaseType> {
  if (dbInstance) return dbInstance;

  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'ceramica.db');
  
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  sqliteInstance = new Database(dbPath);
  sqliteInstance.pragma('journal_mode = WAL');
  sqliteInstance.pragma('foreign_keys = ON');
  sqliteInstance.pragma('busy_timeout = 5000');

  dbInstance = new Kysely<DatabaseType>({
    dialect: new SqliteDialect({ database: sqliteInstance }),
  });

  return dbInstance;
}

export function getRawDatabase(): BetterSqlite3Database | null {
  return sqliteInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.destroy();
    dbInstance = null;
  }
  if (sqliteInstance) {
    sqliteInstance.close();
    sqliteInstance = null;
  }
}