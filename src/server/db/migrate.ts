import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import path from "node:path";
import { getDb, getRawConnection } from "./client";

const __dirname = import.meta.dirname;

/** Aplica las migraciones de drizzle-kit y el esquema FTS5 (idempotente). */
export function runMigrations(): void {
  const db = getDb();
  migrate(db, { migrationsFolder: path.join(__dirname, "migrations") });

  const ftsSql = fs.readFileSync(path.join(__dirname, "fts.sql"), "utf-8");
  getRawConnection().exec(ftsSql);
}

// Permite ejecutar `tsx src/server/db/migrate.ts` directamente.
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
  console.log("Migraciones aplicadas correctamente.");
}
