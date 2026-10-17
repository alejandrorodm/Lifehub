# Fase 7 — Ajustes y datos: exportación, restauración, papelera y borrado total

Objetivo: implementar el módulo de datos (exportar/restaurar/papelera/borrado total) del plan, según `PLAN.md`. Rama: `main` (se trabaja directo, igual que fases 1-6). Runner: `npx vitest run`, `npx tsc --noEmit`, `npx eslint .`, `npx playwright test`.

## Specs

Citas verbatim de `PLAN.md`:

- S1 (tabla de fases, fila 7): "Ajustes y datos: preferencias, exportar JSON, restaurar con validación, papelera, borrado total"
- S2 (criterio de aceptación #7): "Exportar JSON con `schemaVersion`; restaurar en BD vacía reproduce los datos exactamente (test de ida y vuelta); archivo inválido/corrupto se rechaza con mensaje claro sin tocar datos; antes de restaurar se crea snapshot automático; operaciones destructivas exigen confirmación; inicio de semana afecta calendario y estadísticas."
- S3 (pantallas, sección 6): "Ajustes (`/settings`): apariencia, preferencias (inicio de semana, zona horaria, formato), dashboard, datos (exportar JSON, copias, restaurar con validación y vista previa, papelera, borrar todo con confirmación tecleada)."
- S4 (sección 10, datos/copias/configuración): "Export JSON (todas las entidades + settings + `schemaVersion`); import validado con Zod completo, en una transacción, con vista previa de conteos."
- S5 (sección 9, pruebas): "Integración API (Vitest + BD en memoria): cada service/ruta — validación (400 con campos), FK, papelera, export/import ida y vuelta, restauración de archivo inválido." y "E2E (Playwright...): ...recarga → persistencia; exportar → borrar → restaurar; entradas inválidas..."
- S6 (riesgos y decisiones): "Pérdida de datos → Papelera, deshacer, snapshots, autoguardado, confirmaciones, migraciones con snapshot previo."
- S7 (AGENTS.md): toda lectura/escritura pasa por `service.ts`; esquemas Zod compartidos en `src/shared/schemas`; fechas vía `src/shared/domain/dates.ts`.

**Alcance explícitamente fuera de esta fase** (no citado por ningún criterio de aceptación, para no inventar requisitos): preferencia de "formato" de fecha/número separada de inicio de semana/zona horaria (ya existentes desde la fase 1); borrado permanente de un elemento individual desde la papelera (solo se pide "papelera" + "restaurar" + por separado "borrar todo").

**Corrección (2026-10-16, durante la implementación)**: la tabla `meta` (clave/valor) SÍ existe ya en `src/server/db/schema/settings.ts` desde la fase 1, pero no la usa ningún servicio; se incluye igualmente en export/import/wipe (como el resto de tablas, por completitud y exactitud del round-trip) pero el `schemaVersion` del criterio #7 sigue siendo una constante en el propio JSON exportado, no una lectura de esa tabla.

## Tasks

| ID  | Specs      | Ruta   | Estado | Commit/evidencia |
| --- | ---------- | ------ | ------ | ----------------- |
| T1  | S4, S7     | inline | hecho | esquemas Zod de export/import `src/shared/schemas/data.ts` (una fila por tabla, incluida `meta`, + `ExportDataSchema` + `EXPORT_SCHEMA_VERSION`) |
| T2  | S4         | inline | hecho | `src/server/backup/export.ts` (`exportData()`, lectura cruda de las 20 tablas + settings); ampliado el motivo de `createSnapshot` con `"pre-wipe"` |
| T3  | S2, S4, S6 | inline | hecho | `src/server/backup/import.ts`: `parseImportOrThrow`, `previewImport`, `restoreFromImport` (snapshot previo + transacción con `PRAGMA foreign_keys=OFF/ON` fuera de la transacción + `foreign_key_check` dentro como red de seguridad), `wipeAllData()` |
| T4  | S2, S3, S4 | inline | hecho | `src/server/modules/data/service.ts` + rutas nuevas en `routes.ts`: `GET /data/export`, `POST /data/import/preview`, `POST /data/import`, `POST /data/wipe` |
| T5  | S2, S3, S6 | inline | hecho | Papelera por módulo: `listTrash` + `GET /tasks\|notes\|projects/trash` (restore ya existía en los 3); `restoreEvent` + `listTrash` + `GET /events/trash` + `POST /events/:id/restore` nuevos (eventos no tenía restauración) |
| T6  | S2, S5     | inline | hecho | Tests de integración añadidos: `src/server/modules/data/service.test.ts` (round-trip export→wipe→import exacto, preview sin escribir, archivo inválido/corrupto rechazado sin tocar datos, wipe con ajustes a valores por defecto) + una aserción de papelera en cada test de restore ya existente (tasks/notes/projects) + test nuevo de papelera+restore en events. `tsc`, `eslint` y `vitest` (93/93) en verde. |
| T7  | S2, S3, S4 | inline | hecho | Cliente: `src/client/features/settings/useData.ts` (export/import preview/import/wipe) + sección "Datos" de `SettingsPage.tsx` — exportar (descarga el JSON), importar (elegir archivo → vista previa de conteos → confirmar → `POST /data/import`, recarga la app), borrar todo (escribir "BORRAR TODO" para habilitar el botón) |
| T8  | S2, S3     | inline | hecho | Cliente: `src/client/features/trash/{useTrash.ts,TrashPage.tsx}` — página `/trash` ("Papelera") con las 4 secciones (tareas/notas/proyectos/eventos) y botón "Restaurar" por elemento; hooks `useRestoreNote`/`useRestoreProject`/`useRestoreEvent` nuevos (solo existía `useRestoreTask`); enlace desde Ajustes; ruta `trash` en `router.tsx` |
| T9  | S5         | inline | hecho | `tests/e2e/data.spec.ts` (Playwright, 2 tests): eliminar una tarea y restaurarla desde la Papelera; exportar → eliminar → restaurar importando el archivo descargado (usa `page.waitForEvent("download")` + `setInputFiles` sobre el input oculto, con `aria-label="Elegir archivo de restauración"` añadido para poder localizarlo) |
| T10 | S2         | inline | hecho | Verificado (sin código nuevo): `weekStartsOn` ya se usa en `calendarGrid.ts`/`CalendarPage.tsx`/`MonthView.tsx` (fase 4) y en `src/shared/domain/habits.ts` (fase 6, con tests de unidad del caso límite "cambio de semana") |
| T11 | —          | inline | hecho | `npx tsc --noEmit`, `npx eslint .`, `npx vitest run` (93/93) y `npx playwright test` (30/30, resto skip por proyecto) en verde; `PLAN.md` actualizado (fase 7 → completada) |

Sin Writer trigger: trabajo de una sola persona, secuencial, sin paralelismo — todo inline siguiendo el patrón de las fases 2-6.

**Riesgo**: T3 y T4 tocan el ítem de alto riesgo (1) datos/efectos irreversibles — `restoreFromImport` sobrescribe toda la base de datos y `wipeAllData` la borra por completo. Mitigación ya prevista por el propio plan (S6): snapshot automático antes de cada operación destructiva + confirmación en el cliente. Se documentará `Risk: item 1 (datos irreversibles)` en los commits de T3/T4.

## Log

- L1 (2026-10-16): Usuario: "Continúa con la fase 7". Autorización explícita para implementar, igual que con la fase 6 ("Continua con la ultima fase (Fase 6)").
- L2 (2026-10-16): T1-T11 completadas en la misma sesión. `PLAN.md` actualizado: fase 7 pasa a completada. No se pudo verificar visualmente en un navegador real (extensión Claude en Chrome no conectada en este entorno, igual que en fases 4-6); la cobertura E2E con Playwright real (incluida descarga/subida de archivo) sustituye esa verificación visual para esta fase.
