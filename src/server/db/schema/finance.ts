import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { v7 as uuidv7 } from "uuid";
import { timestamps, softDelete } from "./common";
import { users } from "./users";

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
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
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
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
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
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
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

/**
 * Fase 18: categorías de gasto/ingreso con presupuesto mensual opcional.
 * `colorSlot` (1-8) indexa la paleta categórica de gráficas (`--color-chart-N`),
 * así el color sigue a la categoría y no a su posición en una gráfica.
 */
export const financeCategories = sqliteTable("finance_categories", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["expense", "income"] }).notNull(),
  colorSlot: integer("color_slot").notNull().default(1),
  monthlyBudgetCents: integer("monthly_budget_cents"),
  ...timestamps,
  ...softDelete,
});

// Gastos e ingresos del día a día. Como `finance_entries`, sin papelera: se
// borran de verdad (la UI pide confirmación).
export const financeTransactions = sqliteTable("finance_transactions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["expense", "income"] }).notNull(),
  amountCents: integer("amount_cents").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  description: text("description").notNull(),
  categoryId: text("category_id").references(() => financeCategories.id, { onDelete: "set null" }),
  assetId: text("asset_id").references(() => financeAssets.id, { onDelete: "set null" }),
  note: text("note"),
  ...timestamps,
});
