# Fase 15 — Navegación móvil minimalista y ajuste de vistas a móvil

Branch: `feat/fase-15-nav-movil`. Runner: `npm run typecheck && npm run lint && npm test`.

## Specs

- S1: "Tiene que ser más minimalista en cuanto a las opciones y como encontrarlas y adaptarlas a interfaz móvil lo máximo posible."
- S2: "Hoy, Inbox, Tareas y Calendario fijas, el resto en Más."
- S3: "a lo mejor un usuario no está interesado en X funciones" — el usuario debe poder ocultar secciones que no usa.
- S4: "Haz un rediseño de la página adaptandolo a móvil, algunas vistas no se ajustan bien a la relación de aspecto del movil."

## Alcance y diseño (decisiones tomadas para S1-S4, no son requisitos textuales)

- Barra inferior móvil: 4 secciones fijas (Hoy `/`, Inbox `/inbox`, Tareas `/tasks`, Calendario `/calendar`) + botón "Más" que abre una hoja (sheet) con el resto.
- "Más" lista: Notas, Diario, Proyectos, Hábitos, Finanzas, Mercados, Revisión (filtradas por la preferencia de visibilidad, S3) + Ajustes (siempre visible y no ocultable, para no dejar al usuario sin forma de volver a mostrar secciones).
- Preferencia de visibilidad (S3): mismo patrón ya usado para `dashboardWidgets` en `src/shared/schemas/settings.ts` — un array ordenado de ids visibles; lo ausente está oculto. Se aplica también al sidebar de escritorio (consistencia), pero NO a la paleta de comandos (⌘K), que debe seguir permitiendo ir a cualquier sección aunque esté oculta del menú.
- Vistas que no se ajustan a móvil (S4, hallazgos de auditoría previa):
  - El propio bottom-nav (cubierto por S1/S2 arriba).
  - `Sheet` (panel lateral) no tiene modo móvil: en pantallas estrechas debe anclarse abajo (bottom sheet) en vez de deslizar desde la derecha.
  - Grids de formulario fijos a 2-3 columnas dentro de modales (`EventFormDialog`, `TaskDetailSheet`, resumen de importación en `SettingsPage`) — se aprietan en un modal ya acotado a `100vw` en el móvil.
  - Vistas de semana/mes del calendario (`WeekView`/`MonthView`): grid de 7 columnas fijo sin variante móvil — **pendiente de decisión de producto, ver T5**.

## Tasks

- T1 (S1, S2) — Reestructurar `navigation.ts` (id de sección estable) + `AppShell.tsx`: bottom-nav fijo de 4 + botón "Más" con sheet. Inline. Riesgo: ninguno (navegación interna, sin contrato externo). **Hecho**, commit `3ccb9b9`.
- T2 (S3) — Esquema `visibleNavSections` en `src/shared/schemas/settings.ts` (patrón idéntico a `dashboardWidgets`) + sección nueva en `SettingsPage.tsx` + filtrado en sidebar/bottom-nav/Más. Inline. Riesgo: ninguno (JSON ya existente, sin migración). **Hecho**, commit `3ccb9b9`.
- T3 (S4) — `Sheet.tsx`: bottom-sheet por debajo de `md`, panel lateral desde `md` (mismo breakpoint que el split sidebar/bottom-nav en `AppShell.tsx`). Reusado automáticamente por `TaskDetailSheet` y por el nuevo menú "Más". Inline. Riesgo: ninguno (solo CSS/breakpoints). **Hecho**, commit `3ccb9b9`.
- T4 (S4) — Grids de formulario fijos → 1 columna en móvil, columnas desde `sm:` (`EventFormDialog.tsx`, `TaskDetailSheet.tsx`, `SettingsPage.tsx`). Inline. Riesgo: ninguno. **Hecho**, commit `3ccb9b9`.
- T5 (S4, calendario) — El usuario eligió "vista de un día" (ver Log L4). La app ya tenía un modo "día" (`WeekView` renderizado con un solo día): se fuerza como vista por defecto y única en móvil (incluso si la URL pide semana/mes) y se oculta el selector Mes/Semana/Día, redundante en ese ancho. `src/client/lib/useIsMobile.ts` (hook nuevo, mismo breakpoint `md`=768px que el split sidebar/bottom-nav). Inline. Riesgo: ninguno. **Hecho**, commit `330cba4`.

**Verificación T5:** `npx tsc --noEmit`, `npx eslint .`, `npx vitest run` (205/205) en verde. `npm run test:e2e` completo (52/52 en Desktop; Tablet/Mobile omitidos por diseño salvo los specs de layout, que sí corren en los 3 y pasan) en verde contra una BD de pruebas limpia.

**Verificación T1-T4:** `npx tsc --noEmit`, `npx eslint .`, `npx vitest run` (205/205) en verde. `npx playwright test tests/e2e/shell.spec.ts` (13/13, 2 omitidos por diseño) y `tests/e2e/calendar.spec.ts tests/e2e/tasks.spec.ts tests/e2e/a11y.spec.ts` (25/25 en Desktop, el resto omitido por diseño) en verde. `shell.spec.ts` ajustado: el test de navegación por teclado ahora abre "Más" antes de pulsar una sección no fija; test nuevo que fija el comportamiento (4 fijas visibles, el resto oculto hasta abrir "Más").

## Log

- L1 (usuario, 2026-10-20): "Tiene que ser más minimalista en cuanto a las opciones y como encontrarlas y adaptarlas a interfaz móvil lo máximo posible"
- L2 (usuario, 2026-10-20): "Hoy, Inbox, Tareas y Calendario fijas, el resto en Más. Además, a lo mejor un usuario no está interesado en X funciones. Haz un rediseño de la página adaptandolo a móvil, algunas vistas no se ajustan bien a la relación de aspecto del movil."
- L3: auditoría previa (subagente de solo lectura) localizó los problemas de S4 listados arriba; detalle completo en esta sesión. Calendario semana/mes queda como T5, pendiente de preguntar al usuario antes de tocarlo (dos enfoques con tradeoffs reales: vista de un día vs. grid comprimida).
- L4 (usuario, 2026-10-20): elige "Vista de un día (Recomendado)" para el calendario en móvil, entre esa opción y "Mantener semana/mes, comprimida".
