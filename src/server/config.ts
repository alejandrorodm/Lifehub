import { resolveDataDir, resolveDbPath, resolveBackupsDir } from "./lib/paths";

export const config = {
  host: process.env.LIFEHUB_HOST ?? "127.0.0.1",
  port: Number(process.env.LIFEHUB_PORT ?? 3131),
  dataDir: resolveDataDir(),
  dbPath: resolveDbPath(),
  backupsDir: resolveBackupsDir(),
  isProduction: process.env.NODE_ENV === "production",
  // Número de copias de seguridad automáticas a conservar (rotación).
  backupRetention: 14,
};
