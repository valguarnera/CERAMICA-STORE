import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import type { Database as DatabaseType } from '@/domain/db';
import type { Database as BetterSqlite3Database } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// eslint-disable-next-line no-var
declare global {
  // eslint-disable-next-line no-var
  var __CERAMICA_KYSELY__: Kysely<DatabaseType> | undefined;
  // eslint-disable-next-line no-var
  var __CERAMICA_SQLITE__: BetterSqlite3Database | undefined;
}

const GLOBAL_KEY_DB = '__CERAMICA_KYSELY__';
const GLOBAL_KEY_SQLITE = '__CERAMICA_SQLITE__';

function getGlobalDbInstance(): Kysely<DatabaseType> | null {
  return globalThis[GLOBAL_KEY_DB] ?? null;
}
function setGlobalDbInstance(instance: Kysely<DatabaseType>) {
  globalThis[GLOBAL_KEY_DB] = instance;
}
function getGlobalSqliteInstance(): BetterSqlite3Database | null {
  return globalThis[GLOBAL_KEY_SQLITE] ?? null;
}
function setGlobalSqliteInstance(instance: BetterSqlite3Database) {
  globalThis[GLOBAL_KEY_SQLITE] = instance;
}

function createDatabase(): Kysely<DatabaseType> {
  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'ceramica.db');
  
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  let sqlite = getGlobalSqliteInstance();
  if (!sqlite) {
    sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    sqlite.pragma('busy_timeout = 5000');
    setGlobalSqliteInstance(sqlite);
  }

  let kysely = getGlobalDbInstance();
  if (!kysely) {
    kysely = new Kysely<DatabaseType>({
      dialect: new SqliteDialect({ database: sqlite }),
    });
    setGlobalDbInstance(kysely);
  }
  return kysely;
}

export function getDatabase(): Kysely<DatabaseType> {
  const existing = getGlobalDbInstance();
  if (existing) return existing;
  return createDatabase();
}

export function getRawDatabase(): BetterSqlite3Database | null {
  return getGlobalSqliteInstance();
}

export function closeDatabase(): void {
  const kysely = getGlobalDbInstance();
  if (kysely) {
    kysely.destroy();
    delete globalThis[GLOBAL_KEY_DB];
  }
  const sqlite = getGlobalSqliteInstance();
  if (sqlite) {
    sqlite.close();
    delete globalThis[GLOBAL_KEY_SQLITE];
  }
}

if (process.env.NODE_ENV === 'development' && typeof module !== 'undefined') {
  const hotModule = module as unknown as { hot?: { dispose: (fn: () => void) => void } };
  if (hotModule.hot) {
    hotModule.hot.dispose(() => {
      // Close database on HMR to avoid native module mismatch across reloads
      closeDatabase();
    });
  }
}