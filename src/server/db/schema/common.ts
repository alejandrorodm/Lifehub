import { integer } from "drizzle-orm/sqlite-core";

/** Columnas de auditoría compartidas por toda tabla de contenido. */
export const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
};

/** Columna de papelera (borrado suave). */
export const softDelete = {
  deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
};
