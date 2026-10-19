import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { v7 as uuidv7 } from "uuid";
import { timestamps, softDelete } from "./common";

/**
 * Finanzas (fase 10): registro manual de aportaciones/retiros, sin precios en
 * vivo ni valoración de mercado — una entrada es siempre "metí/retiré X en la
 * fecha Y". Cantidades en céntimos enteros para no depender de redondeo de
 * coma flotante con dinero.
 */
export const financeAssets = sqliteTable("finance_assets", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  name: text("name").notNull(),
  type: text("type", { enum: ["fund", "crypto", "stock", "cash", "other"] })
    .notNull()
    .default("other"),
  note: text("note"),
  ...timestamps,
  ...softDelete,
});

export const financeGoals = sqliteTable("finance_goals", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  name: text("name").notNull(),
  targetAmountCents: integer("target_amount_cents").notNull(),
  targetDate: text("target_date"), // YYYY-MM-DD
  ...timestamps,
  ...softDelete,
});

// Registro histórico de aportaciones/retiros: no tiene papelera, se borra de verdad
// (mismo criterio que habit_logs).
export const financeEntries = sqliteTable("finance_entries", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  assetId: text("asset_id")
    .notNull()
    .references(() => financeAssets.id, { onDelete: "cascade" }),
  goalId: text("goal_id").references(() => financeGoals.id, { onDelete: "set null" }),
  date: text("date").notNull(), // YYYY-MM-DD
  type: text("type", { enum: ["deposit", "withdrawal"] }).notNull(),
  amountCents: integer("amount_cents").notNull(),
  note: text("note"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});
