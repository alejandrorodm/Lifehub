import os from "node:os";
import path from "node:path";
import fs from "node:fs";

/**
 * Directorio donde viven la base de datos y las copias de seguridad.
 * Vive fuera del repositorio para no perderse ni comitearse.
 */
export function resolveDataDir(): string {
  const override = process.env.LIFEHUB_DATA_DIR;
  const dir =
    override && override.trim().length > 0 ? override : path.join(os.homedir(), ".local", "share", "lifehub");
  return path.resolve(dir);
}

export function resolveDbPath(): string {
  return path.join(resolveDataDir(), "lifehub.db");
}

export function resolveBackupsDir(): string {
  return path.join(resolveDataDir(), "backups");
}

export function ensureDataDirs(): void {
  for (const dir of [resolveDataDir(), resolveBackupsDir()]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
