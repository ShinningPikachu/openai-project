import * as SQLite from "expo-sqlite";
import { migrations } from "./schema";
let database: SQLite.SQLiteDatabase | null = null;
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (database) return database;
  const db = await SQLite.openDatabaseAsync("shape-alarm.db");
  await db.execAsync("CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY NOT NULL)");
  for (const migration of migrations) {
    const applied = await db.getFirstAsync<{ version: number }>("SELECT version FROM migrations WHERE version = ?", migration.version);
    if (!applied) { await db.withTransactionAsync(async () => { for (const statement of migration.statements) await db.execAsync(statement); await db.runAsync("INSERT OR IGNORE INTO migrations (version) VALUES (?)", migration.version); }); }
  }
  database = db; return db;
}
