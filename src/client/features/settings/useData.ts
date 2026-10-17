import { useMutation } from "@tanstack/react-query";
import { api } from "@client/lib/api";
import type { ExportData, ImportPreview } from "@shared/schemas/data";

function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Exporta toda la base de datos y descarga el JSON como archivo. */
export function useExportData() {
  return useMutation({
    mutationFn: async () => {
      const exported = await api.get<ExportData>("/data/export");
      downloadJson(exported, `lifehub-export-${exported.exportedAt.slice(0, 10)}.json`);
    },
  });
}

/** Valida un archivo de import y cuenta las filas, sin escribir nada. */
export function useImportPreview() {
  return useMutation({
    mutationFn: (raw: unknown) => api.post<ImportPreview>("/data/import/preview", raw),
  });
}

/** Restaura un export completo: crea un snapshot y reemplaza todos los datos. */
export function useRestoreImport() {
  return useMutation({
    mutationFn: (raw: unknown) => api.post<{ counts: Record<string, number> }>("/data/import", raw),
  });
}

/** Borra permanentemente todos los datos (crea un snapshot antes). */
export function useWipeAll() {
  return useMutation({
    mutationFn: () => api.post<void>("/data/wipe", {}),
  });
}
