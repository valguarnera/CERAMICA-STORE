import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import type { Database as DatabaseType } from '@/domain/db';
import type { Database as BetterSqlite3Database } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let dbInstance: Kysely<DatabaseType> | null = null;
let sqliteInstance: BetterSqlite3Database | null = null;

function createDatabase(): Kysely<DatabaseType> {
  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'ceramica.db');
  
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  sqliteInstance = new Database(dbPath);
  sqliteInstance.pragma('journal_mode = WAL');
  sqliteInstance.pragma('foreign_keys = ON');
  sqliteInstance.pragma('busy_timeout = 5000');

  return new Kysely<DatabaseType>({
    dialect: new SqliteDialect({ database: sqliteInstance }),
  });
}

export function getDatabase(): Kysely<DatabaseType> {
  if (dbInstance) return dbInstance;
  dbInstance = createDatabase();
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

if (process.env.NODE_ENV === 'development' && typeof module !== 'undefined') {
  const hotModule = module as unknown as { hot?: { dispose: (fn: () => void) => void } };
  if (hotModule.hot) {
    hotModule.hot.dispose(() => {
      closeDatabase();
    });
  }
}