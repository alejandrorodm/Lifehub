import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

// Migración de datos 0014: añade "shopping" a las secciones visibles de los
// perfiles que ya las habían personalizado, sin tocar el resto de ajustes.
const SQL = fs.readFileSync(
  path.join(import.meta.dirname, "migrations/0014_show_shopping_nav_section.sql"),
  "utf8",
);

function setup(rows: { userId: string; key: string; value: unknown }[]) {
  const db = new Database(":memory:");
  db.exec("create table settings (user_id text, key text, value text, updated_at integer)");
  const insert = db.prepare("insert into settings values (?, ?, ?, 0)");
  for (const r of rows) insert.run(r.userId, r.key, JSON.stringify(r.value));
  return db;
}

function valueOf(db: Database.Database, userId: string, key = "app") {
  const row = db.prepare("select value from settings where user_id = ? and key = ?").get(userId, key) as {
    value: string;
  };
  return JSON.parse(row.value);
}

describe("0014_show_shopping_nav_section", () => {
  it("añade shopping al final de visibleNavSections y conserva el resto de ajustes", () => {
    const db = setup([
      { userId: "a", key: "app", value: { theme: "dark", visibleNavSections: ["notes", "finance"] } },
    ]);
    db.exec(SQL);
    expect(valueOf(db, "a")).toEqual({ theme: "dark", visibleNavSections: ["notes", "finance", "shopping"] });
  });

  it("es idempotente y no duplica la sección si ya estaba", () => {
    const db = setup([{ userId: "a", key: "app", value: { visibleNavSections: ["shopping", "notes"] } }]);
    db.exec(SQL);
    db.exec(SQL);
    expect(valueOf(db, "a").visibleNavSections).toEqual(["shopping", "notes"]);
  });

  it("no toca perfiles sin preferencia guardada ni otras claves", () => {
    const db = setup([
      { userId: "a", key: "app", value: { theme: "light" } },
      { userId: "b", key: "other", value: { visibleNavSections: [] } },
    ]);
    db.exec(SQL);
    expect(valueOf(db, "a")).toEqual({ theme: "light" });
    expect(valueOf(db, "b", "other")).toEqual({ visibleNavSections: [] });
  });
});
