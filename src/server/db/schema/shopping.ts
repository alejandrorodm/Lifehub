import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { v7 as uuidv7 } from "uuid";
import { timestamps } from "./common";
import { users } from "./users";

/** Listas de la compra con nombre (fase 20). Borrado real con confirmación en la UI. */
export const shoppingLists = sqliteTable("shopping_lists", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  position: integer("position").notNull().default(0),
  ...timestamps,
});

export const shoppingItems = sqliteTable(
  "shopping_items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    listId: text("list_id")
      .notNull()
      .references(() => shoppingLists.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    quantity: text("quantity"),
    checked: integer("checked", { mode: "boolean" }).notNull().default(false),
    position: integer("position").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("shopping_items_list_idx").on(t.listId)],
);
