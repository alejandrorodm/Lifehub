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
| T1  | S5, S6  | inline  | hecho  | esquemas Zod `src/shared/schemas/habits.ts` + dominio puro `src/shared/domain/habits.ts` (racha, % cumplimiento, objetivo semanal) con tests de unidad |
| T2  | S2, S6  | inline  | hecho  | módulo servidor `src/server/modules/habits` (service + routes + tests de integración) |
| T3  | S2, S3  | inline  | hecho  | módulo servidor `src/server/modules/routines` (service + routes + tests de integración) |
| T4  | T2,T3   | inline  | hecho  | wiring `app.ts`, registro de rutas |
| T5  | S3      | inline  | hecho  | cliente: `src/client/features/habits` (lista, detalle con cuadrícula, rutinas) |
| T6  | S2      | inline  | hecho  | widget "Hábitos de hoy" del dashboard conectado a datos reales |
| T7  | S2, S4  | inline  | hecho  | dashboard configurable: ajustes UI para ocultar/reordenar widgets + `TodayPage` honra el orden/visibilidad guardados |
| T8  | —       | inline  | hecho  | verificación final: `tsc`, `eslint`, `vitest`, `playwright`; actualizar `PLAN.md` |

Sin Writer trigger: trabajo de una sola persona, secuencial, sin paralelismo — todo inline siguiendo el patrón de las fases 2-5.

## Log

- L1 (2026-10-15): Usuario: "Continua con la ultima fase (Fase 6)". Autorización explícita para implementar (PLAN.md marcaba la fase 6 como "pendiente de aprobación explícita").
