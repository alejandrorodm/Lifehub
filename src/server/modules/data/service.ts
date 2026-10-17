import { exportData } from "../../backup/export";
import { previewImport, restoreFromImport, wipeAllData } from "../../backup/import";
import { listSnapshots } from "../../backup/snapshot";
import type { ExportData, ImportPreview } from "@shared/schemas/data";

export function getBackups(): { name: string; createdAt: Date; sizeBytes: number }[] {
  return listSnapshots();
}

export function getExport(): ExportData {
  return exportData();
}

export function getImportPreview(raw: unknown): ImportPreview {
  return previewImport(raw);
}

export function restoreImport(raw: unknown): Promise<{ counts: Record<string, number> }> {
  return restoreFromImport(raw);
}

export function wipeAll(): Promise<void> {
  return wipeAllData();
}
