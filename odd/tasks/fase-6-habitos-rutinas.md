# Fase 6 — Hábitos y rutinas; dashboard configurable

Objetivo: implementar el módulo F (hábitos y rutinas) y hacer configurable el dashboard "Hoy", según `PLAN.md`. Rama: `main` (se trabaja directo, igual que fases 1-5). Runner: `npx vitest run`, `npx tsc --noEmit`, `npx eslint .`, `npx playwright test`.

## Specs

Citas verbatim de `PLAN.md`:

- S1 (tabla de fases, fila 6): "Hábitos y rutinas; dashboard configurable"
- S2 (criterio de aceptación #6): "Hábito diario y por días de semana; registrar/desmarcar día; racha, % y objetivo semanal calculados desde `habit_logs` (tests de unidad con casos límite: días no programados, cambio de semana, hoy sin registrar); rutina con pasos marcables; dashboard muestra pendientes del día; widgets se pueden ocultar/reordenar y persiste."
- S3 (pantallas, sección 6): "Hábitos (`/habits`, `/habits/:id`): hoy, cuadrícula de historial, rachas, objetivo semanal; rutinas con pasos."
- S4 (sección 6, dashboard): "bloques configurables (mostrar/ocultar/reordenar)"
- S5 (modelo de datos ya existente, sección 4 — sin migraciones nuevas): tablas `habits`, `habit_logs`, `routines`, `routine_steps`, `routine_step_logs` ya están en `src/server/db/schema/habits.ts` desde la fase 1.
- S6 (AGENTS.md): toda lectura/escritura pasa por `service.ts`; esquemas Zod compartidos en `src/shared/schemas`; lógica de dominio pura y testeada en `domain/`; fechas vía `src/shared/domain/dates.ts`, nunca `new Date()` suelto para "hoy".

## Tasks

| ID  | Specs   | Ruta    | Estado | Commit/evidencia |
| --- | ------- | ------- | ------ | ----------------- |
| T1  | S5, S6  | inline  | hecho (bdd56f6) | esquemas Zod `src/shared/schemas/habits.ts` + dominio puro `src/shared/domain/habits.ts` (racha, % cumplimiento, objetivo semanal) con tests de unidad |
| T2  | S2, S6  | inline  | hecho (bdd56f6) | módulo servidor `src/server/modules/habits` (service + routes + tests de integración) |
| T3  | S2, S3  | inline  | hecho (bdd56f6) | módulo servidor `src/server/modules/routines` (service + routes + tests de integración) |
| T4  | T2,T3   | inline  | hecho (bdd56f6) | wiring `app.ts`, registro de rutas |
| T5a | S3      | inline  | hecho (cdd3a0c) | cliente: lista de hábitos/rutinas en `/habits` (tabs, alta rápida, hoy, racha, objetivo semanal, archivar/restaurar, pasos de rutina) |
| T5b | S3      | inline  | hecho | cliente: `/habits/:id` (`HabitDetailPage.tsx`, detalle editable: nombre/descripción/horario/objetivo, **cuadrícula de historial** de 70 días) + ruta en `router.tsx` |
| T6  | S2      | inline  | hecho | widget "Hábitos de hoy" del dashboard (`TodayPage.tsx`) conectado a `useTodayHabits`/`useTodayRoutines` en vez del `EmptyState` fijo |
| T7  | S2, S4  | inline  | hecho | dashboard configurable: sección "Dashboard" en `SettingsPage.tsx` para ocultar/reordenar `settings.dashboardWidgets`; `TodayPage` renderiza los widgets según ese orden/visibilidad (`dashboardWidgets.ts` con las etiquetas compartidas); widget "Captura rápida" añadido para que el id `quick-capture` del esquema tenga representación real |
| T8  | —       | inline  | hecho | `npx tsc --noEmit`, `npx eslint .`, `npx vitest run` (88/88) y `npx playwright test` (28 passed, resto skip por proyecto) en verde; verificación manual de API (`/api/habits`, `/api/habits/:id`, logs, archive/restore, `/api/settings` PATCH `dashboardWidgets`) con el servidor de desarrollo levantado; `PLAN.md` actualizado al cerrar la fase |

**Nota**: no se pudo verificar visualmente en un navegador real (la extensión Claude en Chrome no estaba conectada en esta sesión); la verificación se hizo por API contra el servidor de desarrollo más tsc/eslint/vitest/playwright en verde. Se recomienda una pasada visual manual antes de considerar la fase cerrada de cara a UX.

Sin Writer trigger: trabajo de una sola persona, secuencial, sin paralelismo — todo inline siguiendo el patrón de las fases 2-5.

## Log

- L1 (2026-10-15): Usuario: "Continua con la ultima fase (Fase 6)". Autorización explícita para implementar (PLAN.md marcaba la fase 6 como "pendiente de aprobación explícita").
- L2 (2026-10-16): Usuario: "Continua con lo pendiente de la fase 6". Se completan T5b, T6, T7 y T8. Commit pendiente de esta sesión. `PLAN.md` actualizado: fase 6 pasa a completada.
