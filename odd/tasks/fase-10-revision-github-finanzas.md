# Fase 10 — Revisión periódica, GitHub (resumen por proyecto) y finanzas con metas

Objetivo: tres funcionalidades nuevas, independientes entre sí en el código: (1) una página de revisión semanal/mensual que agrega datos ya existentes (tareas, hábitos, proyectos, notas, finanzas) sin tabla nueva; (2) un resumen general de actividad de GitHub por proyecto (no un listado de commits); (3) un módulo de finanzas con activos, aportaciones y metas con asignación de cantidades. Rama: `main` (directo, igual que fases 1-9). Runner: `npx vitest run`, `npx tsc --noEmit`, `npx eslint .`, `npx playwright test`.

**No viene de `PLAN.md` original**: el usuario la pidió tras cerrar la fase 9, respondiendo a una pregunta exploratoria mía sobre qué echaba en falta.

## Specs

Citas verbatim del usuario:

- S1: "Echas algo en falta para alguien de dia a dia con proyectos, carrera, trabajo etc? A parte, los hábitos, que sean Gym, Recuperacion hombro, IA, Proyectos personales, en Proyectos personales conectalo con github, me gustaria a lo mejor tener alguna parte de finanzas para trackear dinero que he metido en fondos, crypto etc"
- S2: "Hazlas todas" (confirma las tres propuestas que yo planteé como respuesta a S1: resumen temporal periódico, GitHub de solo lectura, finanzas manuales).
- S3: "Y me gusta la idea de que sea algo general lo del github, para no ir tras commit, tambien pon metas de dinero y a lo mejor poder asignar cantidades a x objetivo"
- S4 (decisión tomada explícitamente vía pregunta): GitHub = "Resumen por proyecto" — cada proyecto se enlaza a un repo, se muestra un resumen general (commits recientes, última actividad), no un listado commit a commit.

Las "4 categorías de hábitos" mencionadas en S1 (Gym, Recuperación hombro, IA, Proyectos personales) son datos de uso de una funcionalidad ya implementada (fase 6) — no requieren código, el usuario las crea desde `/habits`.

## Diseño (decidido tras mapear proyectos/hábitos/rutas/convenciones existentes)

**Revisión periódica** — sin tabla nueva, solo lectura/agregación:
- `src/server/modules/review/service.ts`: `getSummary(period: "week" | "month")` combina: tareas completadas/creadas en el rango (nueva `countCompletedInRange`/`countCreatedInRange` en `tasks/service.ts`, mismo patrón que `listScheduledTasks`), tasa de cumplimiento de hábitos agregada (nueva `getCompletionStats` en `habits/service.ts`, reutilizando `isHabitScheduledOn` de `src/shared/domain/habits.ts`), proyectos activos con su progreso actual + nº de hitos completados en el rango, notas/diario creadas en el rango (nueva `countCreatedInRange` en `notes/service.ts`), aportaciones netas de finanzas en el rango + progreso actual de metas.
- **Decisión de alcance**: la revisión NO incluye actividad de GitHub (vive solo en la pestaña de cada proyecto) — traer datos de una API externa en cada carga de una vista agregada la haría lenta y frágil; se documenta como decisión deliberada, no como omisión.
- Cliente: página nueva `/review` con selector semana/mes, nav item "Revisión" (icono `BarChart3`).

**GitHub (resumen por proyecto)**:
- Columna nueva `githubRepo` (texto nullable, formato `owner/repo`) en `projects` (migración).
- `config.github = { token: process.env.GITHUB_TOKEN }` + `isGithubConfigured()`, mismo patrón que `config.google`/`config.webPush`.
- `src/server/modules/github/service.ts`: `getRepoActivity(repo)` — REST directo con `fetch` a `api.github.com` (sin paquete `octokit`, mismo criterio que fase 9 con `googleapis`: solo hace falta un endpoint). Devuelve `{ lastCommitAt, lastCommitMessage, lastCommitAuthor, commitsLast30Days, repoUrl }`; `commitsLast30Days` es una cuenta aproximada (un único `GET /commits?since=...&per_page=100`, documentado como límite conocido si un repo tiene más de 100 commits/mes).
- Ruta `GET /projects/:id/github-activity` en `projects/routes.ts` (delega en `projectsService.getProject` + `githubService.getRepoActivity`); responde `{ configured: false }` o `{ linked: false }` en vez de error si falta el token o el repo.
- Cliente: nueva pestaña "GitHub" en `ProjectDetailPage` (añadida al union `Tab`), componente `ProjectGithubTab.tsx` — campo de texto para `githubRepo` siempre editable; si hay repo y token configurado, muestra el resumen; si no, estado vacío con la razón exacta.
- Badge de solo lectura "GitHub: configurado/no configurado" en Ajustes → Integraciones (sin flujo OAuth, es solo una variable de entorno del servidor).

**Finanzas con metas**:
- Tablas nuevas: `finance_assets` (id, name, type enum `fund|crypto|stock|cash|other`, note nullable, `...timestamps`, `...softDelete` — mismo ciclo de vida que `projects`/`tasks`), `finance_goals` (id, name, `targetAmountCents` integer, `targetDate` nullable YYYY-MM-DD, `...timestamps`, `...softDelete`), `finance_entries` (id, `assetId` FK `onDelete: cascade`, `goalId` FK nullable `onDelete: set null`, `date` YYYY-MM-DD, `type` enum `deposit|withdrawal`, `amountCents` integer, note nullable, `...timestamps` — sin soft-delete, mismo criterio que `habitLogs`: es un registro histórico, se borra de verdad).
- Cantidades en **céntimos enteros** (nunca `real`/float) para evitar errores de redondeo con dinero — la app no tiene precios en vivo (decisión ya tomada en la conversación: registro manual de aportaciones, no valoración de mercado), así que una "entrada" es siempre "metí/retiré X en la fecha Y", no una cantidad de cripto/participaciones.
- `src/shared/domain/finance.ts` (puro, con tests): `sumEntries(entries, type?)`, `computeGoalProgress(goal, entries)`.
- `src/server/modules/finance/service.ts` + `routes.ts`: CRUD de activos/metas/entradas, listados con balance/progreso calculado vía `hydrate()`, papelera para activos y metas (igual que proyectos), sin papelera para entradas (se borran de verdad).
- Cliente: página nueva `/finance` (`FinancePage.tsx`) — activos con balance, metas con barra de progreso, diálogos para añadir activo/meta/entrada; al crear una entrada de tipo aportación se puede asignar opcionalmente a una meta.
- Export/import/wipe: las 3 tablas son contenido normal (no credenciales) → se añaden a `ExportDataSchema` (`data.ts`), a la lista de borrado de `wipeContentTables` y a `restoreFromImport`, igual que tareas/notas/proyectos — a diferencia de las tablas de la fase 9 que se excluyen del export.

## Tasks

| ID  | Specs      | Ruta   | Estado | Commit/evidencia |
| --- | ---------- | ------ | ------ | ----------------- |
| T1  | diseño     | inline | hecho | Esquema Drizzle `src/server/db/schema/finance.ts` (3 tablas) + columna `githubRepo` en `projects` (`src/server/db/schema/projects.ts`) + migraciones `0001_naive_iron_patriot.sql`/`0002_milky_toad_men.sql` generadas |
| T2  | S1, S3     | inline | hecho | `src/shared/domain/finance.ts` (`sumEntries`, `computeGoalProgress`) + `finance.test.ts`; `src/shared/schemas/finance.ts` |
| T3  | S1, S3     | inline | hecho | `src/server/modules/finance/{service,routes}.ts` + `service.test.ts` (activos, metas, entradas, asignación a meta, papelera de activos/metas); montado en `app.ts` bajo `/finance` |
| T4  | S1, S3     | inline | hecho | Export/import/wipe: `financeAssets`/`financeGoals`/`financeEntries` añadidas a `ExportDataSchema` (`data.ts`), a `wipeContentTables` y `restoreFromImport` (`import.ts`) como contenido normal |
| T5  | S1, S3     | inline | hecho | `src/client/features/finance/{useFinance,money,FinancePage}.tsx`: activos con balance y movimientos recientes, metas con barra de progreso, diálogos de alta de activo/meta/movimiento (con asignación opcional a meta); nav item "Finanzas" (`navigation.ts`), ruta `/finance` (`router.tsx`) |
| T6  | S1, S4     | inline | hecho | `config.github`/`isGithubConfigured()` (`config.ts`); `src/server/modules/github/service.ts` (REST directo, mock de `fetch` en `service.test.ts`); ruta `GET /projects/:id/github-activity` en `projects/routes.ts`; DTOs movidos a `src/shared/schemas/github.ts` (reutilizados por cliente, evita duplicar tipos a mano); `github/routes.ts` nuevo con `GET /status` montado en `/integrations/github` |
| T7  | S1, S4     | inline | hecho | Cliente: pestaña "GitHub" en `ProjectDetailPage` (campo `githubRepo` editable + resumen/estado vacío vía `useProjectGithub.ts`), badge "GitHub: configurado/no configurado" en Ajustes → Integraciones (`useGithub.ts`) |
| T8  | S1, S2     | inline | hecho | `src/shared/domain/review.ts` (`getPeriodRange`) + test; funciones de rango nuevas (`countCompletedInRange`/`countCreatedInRange` en tasks, `getCompletionStats` en habits, `countCreatedInRange` en notes, `countMilestonesCompletedInRange` en projects, `getNetContributionsInRange` en finance); `src/server/modules/review/{service,routes}.ts` montado en `/review`; `src/server/modules/review/service.test.ts` cubre las 5 funciones de rango + un smoke test de `getSummary` (28 tests nuevos en total, 153/153 en verde) |
| T9  | S1, S2     | inline | hecho | Cliente `/review`: `useReview.ts`, `ReviewPage.tsx` (tarjetas de tareas/hábitos/notas/finanzas, proyectos activos con progreso, metas con barra de progreso), selector semana/mes, nav item "Revisión", ruta `/review` |
| T10 | —          | inline | hecho | `README.md` (bullets de Finanzas/GitHub/Revisión, sección "GitHub (fase 10)" en Integraciones, `GITHUB_TOKEN` documentado); `PLAN.md` (fila de la fase 10 en la tabla de estado + sección completa) |
| T11 | —          | inline | hecho | `npx tsc --noEmit` y `npx eslint .` sin errores; `npx vitest run` 153/153 (28 nuevos); `npx playwright test` con `.e2e-data/` limpio 45/45 (72 omitidos por diseño), incluyendo `a11y.spec.ts` ampliado con `/finance` y `/review` sin violaciones críticas; `.e2e-data/` borrado al terminar |

Sin Writer trigger: una sola persona, secuencial — inline igual que fases anteriores.

**Riesgo**: T6-T7 tocan un ítem de alto riesgo (2) seguridad de forma menor — `GITHUB_TOKEN` es una credencial, nunca se expone al cliente ni se loguea, vive solo en `.env` igual que las claves VAPID/OAuth de la fase 9. T1 toca migraciones (ítem 1) pero es puramente aditivo (tablas nuevas + una columna nullable), sin tocar datos existentes.

## Log

- L1 (2026-10-17): Usuario pregunta qué echo en falta para el día a día (proyectos/carrera/trabajo); respondo con 3 propuestas (resumen temporal, GitHub de solo lectura, finanzas manuales) cada una con su trade-off, sin implementar nada (pregunta exploratoria). Usuario: "Hazlas todas". Pide refinamientos: GitHub "general, no ir tras commit" y metas de dinero con asignación de cantidades. Pregunté una aclaración sobre el alcance de GitHub (por proyecto vs. global de cuenta) → "Resumen por proyecto". Mapeo previo (agente de exploración read-only) de proyectos/hábitos/rutas/convenciones de esquema/config/export — resumido en la sección "Diseño".
- L2 (2026-10-19): Usuario: "Continua por donde lo dejamos". Al reconciliar este documento con el estado real del repositorio (git status + lectura de los módulos) se encontró que T1-T4 y T6 ya estaban implementados en el servidor de una sesión anterior pero el documento seguía marcándolos "pendiente" — se corrigió el estado antes de seguir, en vez de reimplementarlos o darlos por completados sin verificar. T5, T7-T11 se implementaron en esta sesión: cliente de finanzas, pestaña GitHub + badge de Ajustes (con los DTOs movidos a `src/shared/schemas/github.ts` para no duplicar tipos a mano, corrigiendo una desviación de la convención de AGENTS.md en el código ya existente de T6), módulo de revisión periódica completo (dominio puro + 5 funciones de rango nuevas + servicio + cliente), y documentación. Ajuste sobre la marcha: el icono `Github` de `lucide-react` ya no existe en la versión instalada (1.57.0, los iconos de marca se retiraron) — se usó `GitFork` en su lugar. Verificación final: `tsc`/`eslint` limpios, `vitest run` 153/153, `playwright test` 45/45 con `.e2e-data/` limpio al terminar.
