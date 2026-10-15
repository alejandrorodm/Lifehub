import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { config } from "../config";
import { ensureDataDirs } from "../lib/paths";

let sqlite: Database.Database | undefined;
let db: BetterSQLite3Database<typeof schema> | undefined;

/** Abre (o reutiliza) la conexión a la base de datos SQLite local. */
export function getDb(): BetterSQLite3Database<typeof schema> {
  if (db) return db;

  ensureDataDirs();
  sqlite = new Database(config.dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("synchronous = NORMAL");

  db = drizzle(sqlite, { schema });
  return db;
}

/** Conexión cruda, necesaria para backups (`.backup()`) y SQL manual (FTS5). */
export function getRawConnection(): Database.Database {
  if (!sqlite) getDb();
  if (!sqlite) throw new Error("La base de datos no se ha inicializado.");
  return sqlite;
}

export function closeDb(): void {
  sqlite?.close();
  sqlite = undefined;
  db = undefined;
}

export type Db = BetterSQLite3Database<typeof schema>;
