# Fase 13 — Perfiles con datos totalmente separados (Ioana / Alex)

Objetivo: dos perfiles con contraseña (Ioana, Alex), cada uno con sus propios datos (tareas, notas, calendario, hábitos, finanzas, etc.) completamente privados del otro. Rama: ninguna (se trabaja en `main`, igual que fases anteriores; commit solo bajo confirmación explícita del usuario). Runner de tests: `npx vitest run` / `npx playwright test`.

## Specs

- S1: "añade perfiles, quiero usarlo yo y mi novia (asi que Ioana y Alex) y que tengan contraseña o algo (taquito10 y burrito10 respectivamente)"
- S2 (decisión confirmada explícitamente vía pregunta enfocada, entre "acceso compartido" y "datos totalmente separados"): "Datos totalmente separados" — cada perfil con sus propias tareas, notas, calendario, hábitos, finanzas, etc.; nada compartido entre los dos salvo la infraestructura de la app (el mismo proceso, el mismo archivo SQLite, las mismas copias de seguridad).

## Diseño

- Tabla nueva `users` (id, name, passwordHash, timestamps). Contraseñas con `node:crypto` `scryptSync` + `timingSafeEqual` (sin dependencia nueva — ya hay justificación suficiente para no añadir bcrypt con solo 2 cuentas fijas).
- Sesión: cookie `httpOnly` firmada con HMAC-SHA256 (`node:crypto`), sin tabla de sesiones ni dependencia nueva. Secreto: `LIFEHUB_SESSION_SECRET` si está en `.env`; si no, se genera una vez y se persiste en `<LIFEHUB_DATA_DIR>/session-secret` (mismo patrón que la BD: fuera del repo, nunca en el export).
- Middleware Hono: toda ruta bajo `/api` exige sesión válida excepto `/api/auth/login`; inyecta `userId` en el contexto de la request.
- **Cada tabla de contenido añade `userId` (no solo las "raíz")**: aunque una tabla hija ya hereda propietario por su FK al padre (p. ej. `checklist_items` vía `task_id`), se añade `userId` directo en todas para que cada función de `service.ts` filtre siempre por columna propia, sin depender de que un JOIN de autorización esté bien hecho en cada sitio — más simple de verificar y más seguro ante un descuido futuro.
- Backfill de datos ya existentes (BD local de desarrollo, con meses de datos de prueba): se asignan al usuario **Alex** por defecto (UUID fijo conocido de antemano, insertado por una migración de datos antes de que las columnas `userId` se vuelvan `NOT NULL`). Se documenta como asunción explícita, no silenciosa.
- `settings` (hoy fila única por `key`) y `google_calendar_connection` (hoy fila única `id="default"`) pasan a tener clave compuesta por `userId`: cada perfil con sus propios ajustes y su propia conexión de Google Calendar.
- Export/import (`/data`): cada usuario exporta/restaura solo sus propios datos (nunca los del otro perfil).
- UI: pantalla de login (nombre + contraseña), guarda de ruta en el shell del cliente, botón de salir. Nada de redirecciones basadas en roles (solo 2 perfiles iguales, sin admin).

## Tasks

| ID | Specs | Ruta | Estado | Evidencia |
|----|-------|------|--------|-----------|
| T1 | S1,S2 | inline | hecho | `db/schema/users.ts` (+ `sessionVersion`), migración `0004_lovely_goblin_queen.sql`, `db/seedUserIds.ts`, `db/seedUsers.ts` + `npm run db:seed-users` (contraseñas solo por variable de entorno, nunca en el repo) |
| T2 | S1,S2 | inline | hecho | `src/server/lib/auth.ts` (hash/verify con `scrypt`, cookie firmada con `sessionVersion` para que cerrar sesión invalide de verdad) + `lib/requestContext.ts` (`AsyncLocalStorage`, listo para T6-T15) |
| T3 | S1,S2 | inline | hecho | `modules/auth/{service,routes}.ts` + middleware en `app.ts` (toda ruta `/api` exige sesión excepto `/api/auth/*`) |
| T4 | S1,S2 | inline | hecho | `features/auth/{useAuth,LoginPage}.tsx`, guarda + indicador de usuario + botón de salir en `AppShell.tsx`, reacción global a 401 en `queryClient.ts` |
| T5 | S2 | inline | hecho | `lib/auth.test.ts`, `modules/auth/service.test.ts`, `db/seedUsers.test.ts`, `app.test.ts` (login/logout/sesión caducada/cookie manipulada, de extremo a extremo vía `app.request()`) |
| T6 | S2 | por decidir | pendiente | `userId` en tasks/projects/milestones/tags + scoping en sus `service.ts` |
| T7 | S2 | por decidir | pendiente | `userId` en events/eventExceptions/googleEventLinks + scoping |
| T8 | S2 | por decidir | pendiente | `userId` en notes/noteTags/noteTasks + scoping (+ FTS5: `fts.sql` necesita filtrar por `userId`) |
| T9 | S2 | por decidir | pendiente | `userId` en habits/habitLogs/routines/routineSteps/routineStepLogs + scoping |
| T10 | S2 | por decidir | pendiente | `userId` en reminders + scoping (+ `reminderPushWorker`/`syncWorker` deben iterar por usuario) |
| T11 | S2 | por decidir | pendiente | `userId` en finance (assets/goals/entries) + scoping |
| T12 | S2 | por decidir | pendiente | `userId` en markets/watchlist_assets + scoping |
| T13 | S2 | por decidir | pendiente | `userId` en inbox_items + scoping |
| T14 | S2 | por decidir | pendiente | `settings` y `google_calendar_connection` → clave compuesta por `userId`; `push_subscriptions` → `userId` |
| T15 | S2 | por decidir | pendiente | export/import (`data.ts`, `export.ts`, `import.ts`) por usuario |
| T16 | S1 | por decidir | pendiente | despliegue: build + migración en el VPS, alta real de Ioana/Alex, dominio `lifehub.alejandrorodm.com` + nginx + certbot |
| T17 | — | — | pendiente | verificación final (tsc/eslint/vitest/playwright) + `PLAN.md`/`README.md`/`AGENTS.md` |

## Log

- L1 (2026-10-19): Petición original, verbatim: "deberias tener las credenciales ya..." (despliegue, fase 12) seguido de, en el mismo hilo, "En que url lo vas a subir?... podrias poner lifehub.alejandrorodm.com, ademas añade perfiles, quiero usarlo yo y mi novia (asi que Ioana y Alex) y que tengan contraseña o algo (taquito10 y burrito10 respectivamente)".
- L2 (2026-10-19): Antes de diseñar, se confirmó con el usuario (pregunta enfocada, única decisión de producto real abierta) el alcance de los perfiles: "acceso compartido" (cambio pequeño, un login delante de los mismos datos) vs. "datos totalmente separados" (cambio arquitectónico grande, toca cada módulo). El usuario eligió la segunda. Implica: no es una fase pequeña, se crea seguimiento ODD completo.
- L3 (2026-10-19): Mapeo inicial (via grep/codegraph, antes de escribir nada): 27 tablas en 12 módulos de datos reales (`tasks`, `projects`, `events`, `notes`, `habits`/`routines`, `reminders`, `finance`, `markets`, `inbox`, `settings`, `googleCalendar`, `push`), con decenas de `getDb()` por `service.ts` que necesitan `userId` en su filtro. Confirmado también: el dominio `lifehub.alejandrorodm.com` no resuelve todavía (sin wildcard en `alejandrorodm.com`) — pendiente de que el usuario añada el registro A; la configuración real del VPS usa nginx + Certbot (no Caddy, a diferencia de lo documentado como "recomendado" en `deploy/README.md` de fase 12 — se ajustará a nginx al llegar a T16).
- L4 (2026-10-19): Decisión de contraseñas: hash con `scrypt` de `node:crypto` (sin dependencia nueva) en vez de bcrypt; sesión con cookie firmada por HMAC (sin tabla de sesiones ni JWT de terceros) — ambas elecciones deliberadas para no añadir dependencias sin necesidad real (AGENTS.md), dado que son solo 2 cuentas fijas sin registro público ni recuperación de contraseña.
- L5 (2026-10-19): T1-T5 (fundación de autenticación) completados y verificados — `npx tsc --noEmit`, `npx eslint .`, `npx vitest run` (194/194) y `npx playwright test` (46/46, 74 omitidos por diseño, igual que antes de esta fase) en verde. Un test propio (`app.test.ts`) encontró un fallo real de diseño antes de cerrar la tarea: una cookie de sesión puramente firmada (HMAC, sin estado en servidor) sigue siendo válida después de "cerrar sesión" si alguien la reproduce — `logout` solo le pedía al navegador que la borrase, no invalidaba la cookie en sí. Corregido añadiendo `sessionVersion` a `users` (se incrementa al cerrar sesión; la cookie incluye el valor con el que se firmó y se compara contra el actual en cada request).
  - Las specs de Playwright asumían sesión ya iniciada (navegaban directo a cada pantalla); se añadió `tests/e2e/global-setup.ts` que inserta un usuario de prueba y escribe un `storageState` con una cookie de sesión ya válida antes de que corran — sin esto, los 46 tests existentes habrían fallado en bloque por el nuevo requisito de login.
  - **Importante, para que no se perciba como "ya terminado" cuando no lo está:** con esto, Ioana y Alex ya pueden iniciar sesión por separado y verán el mismo botón de "cerrar sesión" — pero **todavía ven exactamente los mismos datos** (tareas, notas, calendario, hábitos, finanzas...), porque ninguna tabla de contenido tiene `userId` todavía. Eso es T6-T15, el grueso del trabajo que falta.
