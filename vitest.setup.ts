import { beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import type { Database as DatabaseType } from '@/domain/db';

// Global test database - only for tests that need it
let testDb: Kysely<DatabaseType> | undefined;

beforeAll(() => {
  const sqlite = new Database(':memory:');
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  testDb = new Kysely<DatabaseType>({
    dialect: new SqliteDialect({ database: sqlite }),
  });

  global.__TEST_DB__ = testDb;
});

afterAll(async () => {
  if (testDb) {
    await testDb.destroy();
  }
});

declare global {
  var __TEST_DB__: Kysely<DatabaseType> | undefined;
}