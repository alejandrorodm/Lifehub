# Fase 9 — Integraciones: notificaciones push y Google Calendar

Objetivo: añadir sincronización bidireccional con Google Calendar y notificaciones Web Push (recordatorios que funcionan con la pestaña cerrada), ambas opt-in. Rama: `main` (directo, igual que fases 1-8). Runner: `npx vitest run`, `npx tsc --noEmit`, `npx eslint .`, `npx playwright test`.

**No viene de `PLAN.md` original** (las 8 fases ya estaban completas): el usuario la pidió explícitamente tras cerrar la fase 8. `PLAN.md` y `AGENTS.md` ya se actualizaron con la excepción consciente a "sin servicios externos" (ver sección "Fase 9" de `PLAN.md`).

## Specs

Citas verbatim del usuario (no hay criterios de aceptación preexistentes que citar, al ser alcance nuevo):

- S1: "continua con las implementaciones y mejoras, la idea es tenerlo todo centralizado, podrias sincronizar con Google Calendar el calendario y hacer lo de las notificaciones etc"
- S2 (decisión tomada explícitamente): sincronización **bidireccional** con Google Calendar (no solo lectura).
- S3 (decisión tomada explícitamente): notificaciones push y Google Calendar se implementan en paralelo, no una detrás de otra.
- S4 (política de conflicto acordada): "el cambio más reciente gana" comparando `updatedAt` local vs. `updated` de Google.

**Límite explícito de verificación** (no es una carencia, es una limitación real de este entorno): sin acceso a internet ni a un proyecto real de Google Cloud desde aquí. Todo lo que toque la API real de Google o un push real a un dispositivo se prueba con mocks; la verificación end-to-end con credenciales reales la hace el usuario.

**Alcance explícitamente fuera de esta fase** (para no inventar requisitos no pedidos): sincronización en tiempo real vía webhooks de Google (requeriría una URL pública, lo que rompe "servidor ligado a 127.0.0.1" de la sección 11 de `PLAN.md`) — se usa sondeo periódico + botón "Sincronizar ahora" en su lugar; soporte a varios calendarios de Google a la vez (solo uno, configurable); multi-usuario (la app sigue siendo de un solo usuario).

## Diseño de datos (decidido tras mapear la arquitectura existente)

- `push_subscriptions`: una fila por navegador/dispositivo suscrito.
- `google_calendar_connection`: fila única (`id = "default"`), tokens OAuth + `syncToken` incremental de Google.
- `google_event_links`: mapea `events.id` ↔ evento de Google (no se toca la tabla `events` para no romper el modelo ya probado de recurrencia/excepciones).
- Las 3 tablas se excluyen del export JSON (datos sensibles o sin sentido sin la conexión activa) pero se borran con "Borrar todo".

## Tasks

| ID  | Specs      | Ruta   | Estado | Commit/evidencia |
| --- | ---------- | ------ | ------ | ----------------- |
| T1  | diseño     | inline | hecho | Esquema Drizzle `src/server/db/schema/integrations.ts` (3 tablas) + migración `0001_naive_iron_patriot.sql` aplicada; `src/server/config.ts` con `config.google`/`config.webPush` (opt-in, `undefined` si no hay env vars) + `isGoogleConfigured()`/`isWebPushConfigured()`; `wipeContentTables` (`import.ts`) incluye las 3 tablas nuevas; comentario en `src/shared/schemas/data.ts` documentando la exclusión del export |
| T2  | S3         | inline | hecho | `web-push` añadido (justificado por S3). `src/server/modules/push/{service,routes,reminderPushWorker}.ts`: `GET /push/public-key`, `POST /push/subscribe` (upsert por endpoint), `POST /push/unsubscribe`; worker server-side (20s, mismo intervalo que `ReminderWatcher`) que llama a `sendDueReminderPushes()`, limpia suscripciones caducadas (404/410) solas. 6 tests en `service.test.ts` (mock de `web-push`), `tsc`/`eslint` en verde |
| T3  | S3         | inline | hecho | `src/client/public/sw.js` (recibe `push`, muestra notificación, foca/abre la app al clicar); `src/client/features/settings/usePush.ts` (estado soportado/configurado/suscrito, activar/desactivar); sección "Integraciones" nueva en `SettingsPage.tsx` con el botón "Activar notificaciones push"; override de ESLint para el entorno global del service worker |
| T4  | S1, S2     | inline | hecho | OAuth con Google sin el paquete `googleapis` (REST directo con `fetch`, justificado: solo hace falta el token endpoint): `src/server/modules/googleCalendar/{oauth,service,routes}.ts` — `GET /connect`, `GET /callback` (valida `state`, guarda la conexión), `POST /disconnect` (revoca + borra), `GET /status`; refresco de token automático en `getValidAccessToken()`. 10 tests (`service.test.ts`, mock de `fetch`) |
| T5  | S2, S4     | inline | hecho | Motor de sincronización bidireccional `src/server/modules/googleCalendar/sync.ts`: `pushLocalChanges()` (crear/editar/borrar evento local → Google), `pullFromGoogle()` (incremental con `syncToken`, reinicio automático si caduca con 410), resolución de conflicto "el cambio más reciente gana". **No se integró en cada mutación de `events/service.ts`** (como decía el plan inicial) sino en un worker periódico (cada 5 min) + botón manual — más simple, sin acoplar el CRUD de eventos a una llamada de red, y coherente con la decisión de "sin webhooks" ya tomada. Límite documentado: las excepciones de una sola ocurrencia de una serie recurrente no se sincronizan todavía (Google las modela distinto); se ignoran sin corromper la serie base. 10 tests (`sync.test.ts`, mock de `fetch`, cubre creación/edición/borrado en ambos sentidos, conflicto, cancelación y syncToken caducado) |
| T6  | S1         | inline | hecho | `src/client/features/settings/useGoogleCalendar.ts` + sección "Google Calendar" en `SettingsPage.tsx`: "Conectar" (navegación real a `/api/integrations/google/connect`, no un fetch — lo exige el flujo OAuth), estado de conexión, "Sincronizar ahora", "Desconectar"; toast al volver del callback (`?google=connected\|error`). El calendario existente (mes/semana/día) no necesitó ningún cambio: los eventos de Google se materializan como filas `events` normales. Axe sin violaciones nuevas en `/settings` |
| T7  | límite de verificación | inline | hecho | Ya cubierto durante T2/T4/T5, no como tarea aparte: 6 tests de push (mock `web-push`), 10 de OAuth (mock `fetch`) y 10 del motor de sync (mock `fetch`, cubre round-trip, conflicto, cancelación, syncToken caducado) — 119/119 en verde. Sin tests de `routes.ts` (igual que el resto del proyecto: son solo validación+delegación). Pendiente real, no cubribile desde aquí: conectar con una cuenta de Google de verdad y recibir un push en un dispositivo real — lo tiene que probar el usuario con sus credenciales |
| T8  | — | inline | hecho | `README.md`: banner de estado, bullet de "Integraciones" en Funcionalidades, sección nueva "Integraciones (opcionales)" (pasos de Google Cloud Console, comando de claves VAPID, variables de `.env` nuevas, limitación de excepciones de recurrencia), "Limitaciones conocidas" actualizada. **No se pudo tocar `.env.example` directamente** (bloqueado por los permisos de este entorno para archivos `.env*`): las variables nuevas se documentaron en el README para que el usuario las añada a mano |
| T9  | — | inline | hecho | `tsc`, `eslint`, `vitest run` (119/119) y `playwright test` (43/43 en los 3 viewports, 68 omitidos por diseño) en verde, con `.e2e-data/` limpio; axe sin violaciones nuevas en Ajustes; `PLAN.md` fase 9 → implementada, con la nota de verificación pendiente de credenciales reales |

Sin Writer trigger: una sola persona, secuencial — inline igual que fases 1-8. Las dos integraciones son independientes entre sí en el código (archivos distintos, sin superficie compartida salvo la migración y la sección de Ajustes), pero se mantienen inline por coherencia de diseño (política de conflicto, convención de tablas) en vez de delegarlas a escritores en paralelo.

**Riesgo**: T2-T5 tocan el ítem de alto riesgo (2) seguridad — tokens OAuth y claves de suscripción push. Mitigación: nunca en el export JSON, nunca logueados, solo en variables de entorno/BD local.

## Log

- L1 (2026-10-17): Usuario: "continua con las implementaciones y mejoras... podrias sincronizar con Google Calendar el calendario y hacer lo de las notificaciones etc". Antes de implementar se preguntó (a) dirección de sync → bidireccional, (b) orden → ambas en paralelo. Se avisó de dos cosas que no son decisiones mías: crear credenciales OAuth en Google Cloud Console (lo tiene que hacer el usuario) y la tensión con la regla "sin servicios externos" de `AGENTS.md` (documentada como excepción explícita, no ignorada).
- L2 (2026-10-17): Mapeo previo (agente de exploración read-only) de eventos/recurrencia/recordatorios/ajustes/export-import/config/migraciones, resumido en la sección "Diseño de datos" — define T1-T6 sin necesidad de volver a explorar desde cero.
- L3 (2026-10-17): T1-T9 completadas en la misma sesión. Dos ajustes de diseño sobre la marcha, documentados en sus tareas: (a) la sincronización se integró como un worker periódico + botón manual en vez de enganchada a cada mutación de `events/service.ts` (más simple, sin acoplar el CRUD a una llamada de red); (b) `.env.example` no se pudo editar directamente (bloqueado por los permisos de este entorno para archivos `.env*`) — las variables nuevas quedaron documentadas en `README.md` para que el usuario las añada a mano. No se pudo verificar contra una cuenta real de Google ni un push real a un dispositivo (sin acceso a internet desde este entorno); documentado explícitamente en `PLAN.md` como pendiente del usuario.
