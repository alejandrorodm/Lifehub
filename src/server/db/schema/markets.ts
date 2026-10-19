import { sqliteTable, text, real } from "drizzle-orm/sqlite-core";
import { v7 as uuidv7 } from "uuid";
import { timestamps, softDelete } from "./common";
import { users } from "./users";

/**
 * Fase 11: lista de seguimiento con objetivo de precio, separada a propósito
 * de finance_assets (que excluye deliberadamente precios en vivo, ver
 * fase 10). `targetPrice` es un número real, no céntimos: es una cotización
 * de mercado comparada contra datos externos en coma flotante, no dinero que
 * se suma o resta.
 */
export const watchlistAssets = sqliteTable("watchlist_assets", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["crypto", "stock"] }).notNull(),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  targetPrice: real("target_price"),
  ...timestamps,
  ...softDelete,
});
