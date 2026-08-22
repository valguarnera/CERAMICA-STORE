import { getDatabase, getRawDatabase } from '@/infrastructure/database/sqlite/connection';
import type { Database as BetterSqlite3Database } from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const db = getDatabase();
  const rawDb = getRawDatabase() as BetterSqlite3Database;
  
  const migrationsDir = path.join(__dirname, '../src/infrastructure/database/sqlite/migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration files`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');
    
    console.log(`Running migration: ${file}`);
    
    try {
      if (rawDb) {
        rawDb.exec(sql);
      } else {
        throw new Error('Could not access raw database connection');
      }
      console.log(`✓ ${file} completed`);
    } catch (error) {
      console.error(`✗ ${file} failed:`, error);
      throw error;
    }
  }

  console.log('All migrations completed successfully');
  await db.destroy();
}

runMigrations().catch(console.error);