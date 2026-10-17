import fs from "node:fs";
import path from "node:path";
import { getRawConnection } from "../db/client";
import { config } from "../config";

/**
 * Crea una copia de seguridad consistente del archivo SQLite usando la API
 * de backup online de SQLite (no bloquea escrituras concurrentes).
 * Devuelve la ruta del archivo creado.
 */
export async function createSnapshot(
  reason: "startup" | "pre-restore" | "pre-wipe" | "manual" = "manual",
): Promise<string> {
  const connection = getRawConnection();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `lifehub-${timestamp}-${reason}.db`;
  const dest = path.join(config.backupsDir, fileName);

  fs.mkdirSync(config.backupsDir, { recursive: true });
  await connection.backup(dest);
  rotateSnapshots();
  return dest;
}

/** Conserva solo las `config.backupRetention` copias más recientes. */
function rotateSnapshots(): void {
  if (!fs.existsSync(config.backupsDir)) return;
  const files = fs
    .readdirSync(config.backupsDir)
    .filter((f) => f.endsWith(".db"))
    .map((f) => ({ name: f, time: fs.statSync(path.join(config.backupsDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  for (const file of files.slice(config.backupRetention)) {
    fs.unlinkSync(path.join(config.backupsDir, file.name));
  }
}

export function listSnapshots(): { name: string; createdAt: Date; sizeBytes: number }[] {
  if (!fs.existsSync(config.backupsDir)) return [];
  return fs
    .readdirSync(config.backupsDir)
    .filter((f) => f.endsWith(".db"))
    .map((f) => {
      const stat = fs.statSync(path.join(config.backupsDir, f));
      return { name: f, createdAt: stat.mtime, sizeBytes: stat.size };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
