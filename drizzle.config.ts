import { defineConfig } from "drizzle-kit";
import { resolveDataDir } from "./src/server/lib/paths";
import path from "node:path";

const dataDir = resolveDataDir();

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/server/db/schema/*.ts",
  out: "./src/server/db/migrations",
  dbCredentials: {
    url: path.join(dataDir, "lifehub.db"),
  },
  verbose: true,
  strict: true,
});
