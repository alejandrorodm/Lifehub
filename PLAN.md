# LifeHub — Plan de desarrollo

> Estado: **Fase 8 (QA, accesibilidad y pulido) completada** el 2026-10-17 — las 8 fases originales del plan están completadas. **Fase 9 (integraciones) implementada** el 2026-10-17 y **fase 10 (revisión, GitHub, finanzas) implementada** el 2026-10-19; ninguna de las dos estaba en el alcance original (ver nota en cada fase).

## Estado de las fases

| #   | Fase                                                     | Estado        |
| --- | --------------------------------------------------------- | ------------- |
| 1   | Fundamentos                                                | ✅ Completada |
| 2   | Tareas, Inbox, captura rápida, Dashboard v1                | ✅ Completada |
| 3   | Proyectos e hitos                                          | ✅ Completada |
| 4   | Calendario y recordatorios                                 | ✅ Completada |
| 5   | Notas, diario y búsqueda global                            | ✅ Completada |
| 6   | Hábitos y rutinas; dashboard configurable                  | ✅ Completada |
| 7   | Ajustes, exportación, copias y restauración                | ✅ Completada |
| 8   | QA, accesibilidad y pulido                                 | ✅ Completada |
| 9   | Integraciones: notificaciones push y Google Calendar       | ✅ Implementada (ver nota de verificación) |
| 10  | Revisión periódica, GitHub por proyecto y finanzas con metas | ✅ Implementada |

## Situación inicial

Directorio vacío (sin archivos ni git) a 2026-10-15. Entorno: Linux, Node v24.15.0, npm 11.12.1; `ollama` no está en el PATH (se verificará en la fase de IA; no bloquea el núcleo).

## Fase 1 — Fundamentos (completada el 2026-10-15)

**Implementado:**

- Scaffold completo: TypeScript estricto, Vite + React 19, Tailwind v4 (tokens en `src/client/styles/tokens.css`), ESLint (flat config), Prettier, Vitest, Playwright.
- Modelo de datos completo (20 tablas + FTS5) en `src/server/db/schema/*.ts`, migraciones generadas con drizzle-kit, aplicadas automáticamente al arrancar (`src/server/db/migrate.ts`).
- Servidor Hono (`src/server/app.ts`) con manejo de errores centralizado (`AppError` → `{ error: { code, message, fields? } }`), validación Zod compartida cliente/servidor.
- Primer módulo real de extremo a extremo (ajustes: tema, inicio de semana, zona horaria) — sirve de plantilla para el resto de módulos.
- Copias de seguridad automáticas al arrancar (`src/server/backup/snapshot.ts`, API de backup online de SQLite) con rotación; listado de solo lectura en Ajustes.
- Shell de navegación responsive (sidebar en escritorio/tablet, barra inferior en móvil), con las 8 secciones enlazadas; las que aún no tienen módulo muestran un estado vacío honesto indicando en qué fase llegarán.
- Dashboard "Hoy" con saludo, fecha y widgets en estado vacío real (sin datos simulados).
- Tema claro/oscuro/sistema persistido en el servidor, aplicado sin parpadeo (caché de pintado en `localStorage`, fuente de verdad en la BD).
- Sistema de toasts (Radix) conectado al `QueryClient` global: cualquier error de API se muestra de forma legible.
- Componentes de UI base: `Button`, `Select`, `Toast`, `EmptyState`, `Skeleton`.

**Probado** (comandos ejecutados en esta sesión, todos en verde):

- `npx tsc --noEmit` — sin errores.
- `npx eslint .` — sin errores ni avisos.
- `npx vitest run` — 14/14 tests (esquema de ajustes, `AppError`/`parseOrThrow`, servicio de ajustes contra SQLite real con migraciones aplicadas, `EmptyState`, toast-on-error).
- `npx playwright test` — 9/9 tests en Desktop (1440px)/Tablet (768px)/Mobile (390px): navegación por teclado a las 8 secciones, persistencia del tema tras recargar, barra inferior visible en móvil.
- Arranque manual del servidor y del cliente (dev y producción/`vite build`): API de ajustes (GET/PATCH con validación 400, 404 en rutas inexistentes), proxy cliente→servidor, estáticos + fallback SPA en producción, copia de seguridad creada al arrancar — todo verificado con `curl` contra una base de datos real.

**Pendiente / fuera de alcance de esta fase** (según PLAN.md, se abordará en fases siguientes):

- Verificación visual en un navegador real (este entorno no tiene la extensión de Chrome conectada); se recomienda abrir `npm run dev` y revisarlo manualmente.
- Paleta de comandos, atajos "G + letra" y captura rápida (fase 2).
- Exportación, copia manual y restauración de datos (fase 7).
- División de código del bundle cliente (Vite avisa de un chunk >500 kB con Radix+TipTap; no es bloqueante, se revisará en la fase 8).

## Fase 2 — Tareas, Inbox, captura rápida y Dashboard v1 (completada el 2026-10-15)

**Implementado:**

- Módulo de tareas completo (`src/server/modules/tasks`): CRUD, subtareas (un nivel), checklist, etiquetas (crear/reutilizar por nombre), 5 vistas (Hoy/Próximas/Atrasadas/Completadas/Todas) calculadas con la zona horaria de ajustes (`@shared/domain/dates`, nunca `new Date()` suelto), filtros por proyecto/etiqueta/prioridad/búsqueda, papelera (borrado suave) con restauración.
- Recurrencia de tareas (`daily|weekly|monthly|yearly`, `src/server/domain/recurrence.ts` sobre `rrule`): al completar una tarea recurrente, modelo Todoist — avanza su fecha y sigue activa en vez de archivarse; una tarea normal se completa de verdad.
- Módulo de Inbox (`src/server/modules/inbox`): captura, listado, archivado y conversión a tarea.
- Cliente: página de Tareas con pestañas de vista, alta rápida, panel de detalle (`TaskDetailSheet`) con checklist, subtareas, etiquetas, prioridad, fecha/hora y repetición; página de Inbox real; Dashboard "Hoy" con el widget "Prioritarias y atrasadas" conectado a datos reales y contador de pendientes/completadas hoy.
- Captura rápida global (atajo `C`/`Q`, ≤2 pasos) e inbox con contador visible en la navegación.
- Paleta de comandos (`Ctrl/⌘+K`): navegación a las 8 secciones + capturar. Atajos: `G` + letra (ir a), `N` (nuevo, delegado a la pantalla activa), `J`/`K` (mover selección), `X` (completar la tarea seleccionada), `?` (ayuda).
- Componentes de UI nuevos: `Dialog`, `Sheet`, `Checkbox`, `Input`/`Textarea`/`Label`.
- Sin tablas nuevas: el modelo de datos completo ya existía desde la fase 1; esta fase solo añadió servicios y rutas sobre él.

**Probado** (comandos ejecutados en esta sesión, todos en verde):

- `npx tsc --noEmit`, `npx eslint .` — sin errores.
- `npx vitest run` — 25/25 tests, incluyendo 11 nuevos de integración sobre SQLite real: vistas por fecha, avance de recurrencia al completar, NO avance en tareas sin recurrencia, reapertura limpia `completedAt`, reutilización de etiquetas por nombre, subtareas y su recuento, checklist, borrado suave + restauración + cascada a subtareas, captura→conversión de inbox.
- `npx playwright test` — 14/14 (10 omitidos a propósito: los flujos que mutan datos se verifican una sola vez en Desktop para no duplicar datos entre los tres proyectos de viewport, que comparten servidor). Cubre: crear/abrir/completar una tarea con checklist, eliminar con confirmación, captura rápida → inbox → conversión a tarea, paleta de comandos navegando por teclado, atajo "G T".
- **Bug real encontrado y corregido por los propios tests E2E**: en el viewport móvil, la barra de pestañas de vistas de Tareas desbordaba el ancho de la página (sin scroll ni wrap), lo que inflaba el _layout viewport_ y descolocaba la barra de navegación inferior (quedaba fuera del área clicable). Se corrigió con `overflow-x-auto` en las pestañas y una red de seguridad (`overflow-x: hidden` en `html,body`).
- **Bug real encontrado y corregido por un test de integración**: `SettingsPatchSchema` (fase 1) aplicaba los `.default()` de Zod a los campos ausentes de un PATCH parcial, sobrescribiéndolos; ver fase 1. (Referencia cruzada, no de esta fase.)
- Verificado manualmente con `curl` contra una base de datos real: creación con etiquetas y recurrencia, las 5 vistas, resumen del dashboard, checklist, avance de recurrencia al completar, borrado+restauración, captura+conversión, validación 400 en título vacío, subtareas.

**Pendiente / fuera de alcance de esta fase:**

- Verificación visual en navegador real (sin extensión de Chrome conectada en este entorno).
- "Convertir en nota" / "mover a proyecto" desde el Inbox: no tienen sentido todavía sin los módulos de Notas (fase 5) y Proyectos (fase 3); el Inbox solo ofrece "convertir en tarea" y "archivar".
- Recordatorios de tareas (dependen del módulo de Calendario, fase 4).
- Reordenar tareas/checklist por arrastre (drag & drop): se usa el campo `position` pero todavía no hay UI para reordenar a mano.
- Deshacer tras eliminar (se optó por una confirmación de dos pasos en su lugar; ver decisión más abajo).

**Decisiones de esta fase:**

- _Historial de recurrencia_: en vez de una tabla de log de completados, se interpretó "conservando historial" como que la tarea recurrente conserva su identidad (notas, checklist, etiquetas) en vez de recrearse en cada ocurrencia. Si se necesita un registro literal de cada completado (útil para estadísticas en la fase 6), se añadirá entonces como una tabla nueva.
- _Confirmación vs. deshacer_ al eliminar una tarea: se implementó una confirmación de dos pasos dentro del propio panel de detalle en vez de un botón "Deshacer" en el toast, por simplicidad; ambas opciones cumplen el requisito de AGENTS.md.

## 1. Requisitos

**Funcionales** — módulos A–I tal como los especificó el usuario (Dashboard Today, Calendario, Tareas, Notas y diario, Proyectos y objetivos, Hábitos y rutinas, Inbox, Búsqueda global, Ajustes y datos). Sin integraciones externas simuladas.

**No funcionales**

- Local-first: un proceso Node en `127.0.0.1`, una base SQLite en disco. Sin nube, sin Docker, sin cuentas.
- Arranque con `npm install && npm run dev` (o `npm start` tras `build`).
- TypeScript estricto extremo a extremo; validación con el mismo esquema Zod en cliente y servidor.
- Integridad: claves foráneas, transacciones, migraciones versionadas, papelera (borrado suave), copias automáticas.
- Rendimiento: interacción instantánea con miles de tareas/notas (SQLite local + caché de consultas + actualizaciones optimistas).
- Accesibilidad: teclado completo, foco visible, etiquetas ARIA, contraste AA, `prefers-reduced-motion`.
- Privacidad: cero telemetría, fuentes e iconos empaquetados (sin CDN), servidor solo en loopback.
- UI en español; código, identificadores y commits en inglés.

## 2. Stack y justificación

| Capa            | Elección                                                                               | Por qué                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Lenguaje        | TypeScript (strict)                                                                    | Tipado compartido cliente/servidor.                                                                         |
| Frontend        | React 19 + Vite                                                                        | Ecosistema maduro, HMR rápido, SPA suficiente (sin SEO ni SSR).                                             |
| Routing         | React Router (modo SPA)                                                                | Rutas anidadas, URL como estado (filtros, fecha visible).                                                   |
| Estado servidor | TanStack Query                                                                         | Caché, invalidación entre módulos (completar tarea → dashboard/proyecto se actualizan), optimistic updates. |
| Estilos         | Tailwind CSS v4 + tokens CSS propios                                                   | Sistema de diseño con variables (claro/oscuro) sin CSS disperso.                                            |
| Primitivas UI   | Radix UI (dialog, popover, dropdown, tooltip…) + componentes propios                   | Accesibilidad resuelta sin imponer estética.                                                                |
| Iconos          | lucide-react                                                                           | Consistentes, tree-shakeable, sin emojis.                                                                   |
| Editor          | TipTap (ProseMirror) con contenido guardado en **Markdown**                            | Formato portable, exportable y legible por un LLM.                                                          |
| Fechas          | date-fns + @date-fns/tz                                                                | Funcional, inmutable, soporte IANA.                                                                         |
| Recurrencia     | `rrule` (RFC 5545)                                                                     | Estándar probado; evita implementar recurrencias a mano.                                                    |
| Servidor        | Hono sobre `@hono/node-server`                                                         | Ligero, tipado, validador Zod integrado, cliente RPC tipado.                                                |
| BD              | SQLite (`better-sqlite3`) + Drizzle ORM y drizzle-kit                                  | Archivo único, transacciones síncronas, FTS5 para búsqueda, migraciones SQL versionadas.                    |
| Validación      | Zod                                                                                    | Un esquema en `src/shared` usado por formularios y endpoints.                                               |
| Formularios     | react-hook-form + resolver Zod                                                         | Validación cómoda y errores por campo.                                                                      |
| Tests           | Vitest (unidad + API con BD en memoria), Testing Library, Playwright (E2E y viewports) | Cubren los flujos de la sección 9.                                                                          |
| Calidad         | ESLint + Prettier, `tsc --noEmit`                                                      | Comprobación en cada fase.                                                                                  |

Versiones: se fijan las últimas estables al instalar (lockfile versionado). Descartados: Next.js (SSR innecesario, mezcla capas), IndexedDB puro (sin validación de servidor ni punto seguro para el asistente IA), Electron/Tauri (empaquetado extra; posible ampliación futura), Prisma (motor binario más pesado).

**Limitaciones de local-first** (irán al README): datos en un solo equipo (sin sincronización); recordatorios solo con la app abierta en el navegador; la seguridad depende del acceso al equipo (sin autenticación, servidor solo en loopback).

## 3. Arquitectura

```
Navegador (SPA React)
  features/<módulo>  →  lib/api (cliente Hono tipado + TanStack Query)
                            │ HTTP JSON 127.0.0.1:5173→3000
Servidor Hono
  routes/<módulo>  → valida (Zod shared) → services/<módulo> (lógica de dominio)
                                               │ Drizzle (transacciones)
                                            SQLite (WAL, FK on, FTS5)
  backup/  (snapshots, export/import)
  [futuro] ai/ → usa los MISMOS services mediante herramientas con permisos
```

Principios:

- **Los services son la única puerta a los datos.** Las rutas no contienen SQL; el futuro asistente tampoco. Así validación, reglas (progreso, rachas, recurrencia) y auditoría viven en un solo sitio.
- Lógica pura (cálculo de rachas, progreso, expansión de recurrencias, detección de conflictos) en `src/shared/domain` o `src/server/domain`, sin I/O, testeable con unidad.
- Errores: clase `AppError` (`code`, `status`, `details`) + middleware único → respuesta `{ error: { code, message, fields? } }`; el cliente la traduce a toasts o errores de campo. Error boundary por ruta.
- Fechas: instantes en UTC ISO‑8601; fechas sin hora (`due_date`, días completos, registro de hábitos, diario) como `YYYY-MM-DD` local; zona horaria IANA del usuario en ajustes (por defecto la del navegador). "Hoy" siempre se calcula en esa zona.
- Recurrencias: eventos con `RRULE` + excepciones, expandidos en servidor por rango; tareas recurrentes generan la siguiente ocurrencia al completarse (modelo Todoist), conservando historial.
- Producción: Hono sirve el build estático y la API en un único puerto.

## 4. Modelo de datos (SQLite)

IDs: UUIDv7 en texto (ordenables, estables en export/import). Todas las tablas con `created_at`, `updated_at`; las de contenido con `deleted_at` (papelera).

- **projects**: id, name, description, status (`planned|active|paused|completed`), priority, start_date?, target_date?, color, archived_at?
- **milestones**: id, project_id → projects, title, due_date?, completed_at?, position
- **tasks**: id, title, description (md), status (`todo|in_progress|done`), priority (`low|normal|high|urgent`), due_date?, due_time?, project_id?, milestone_id?, parent_task_id? (subtareas, un nivel), recurrence_rule?, recurrence_parent_id?, completed_at?, position
- **checklist_items**: id, task_id, text, done, position
- **tags**: id, name (único), color — **task_tags**, **note_tags** (tablas puente con FK reales)
- **events**: id, kind (`event|time_block`), title, description, location, start_at, end_at, all_day, start_date?/end_date? (días completos), timezone, rrule?, project_id?, task_id?
- **event_exceptions**: event_id, original_start, cancelled | override (campos modificados)
- **notes**: id, kind (`note|journal`), title, content_md, content_text (para búsqueda), journal_date? (único por día cuando kind=journal), pinned, favorite, archived_at?, project_id?
- **note_tasks**: note_id, task_id (relación N:M nota↔tarea)
- **habits**: id, name, description, schedule_type (`daily|weekdays`), weekdays_mask, weekly_target?, color, archived_at?
- **habit_logs**: habit_id, date (`YYYY-MM-DD`), único (habit_id, date)
- **routines**: id, name, schedule (igual que hábitos) — **routine_steps**: routine_id, title, position — **routine_step_logs**: step_id, date
- **inbox_items**: id, text, kind_hint (`task|note|idea|reminder|unsorted`), status (`open|processed|archived`), converted_type?, converted_id?
- **reminders**: id, target_type (`task|event|none`), target_id?, title, remind_at (UTC), fired_at?, dismissed_at?
- **settings**: key, value (JSON validado con Zod): tema, densidad, inicio de semana, zona horaria, layout del dashboard, opciones de copia.
- **search_index** (FTS5 virtual): entity_type, entity_id, title, body — mantenido por triggers SQL en tasks/notes/projects/events.
- **meta**: schema_version, last_backup_at.

Derivados (nunca almacenados como datos ficticios): progreso de proyecto = tareas completadas / tareas totales (con hitos como indicador separado); rachas y % de cumplimiento = cálculo sobre `habit_logs` respetando los días programados; conflictos horarios = solapamiento de ocurrencias expandidas.

## 5. Estructura de carpetas

```
Lifehub/
  PLAN.md  AGENTS.md  README.md  .env.example  .gitignore
  package.json  tsconfig.json  vite.config.ts  drizzle.config.ts
  vitest.config.ts  playwright.config.ts  eslint.config.js
  src/
    shared/          schemas/ (Zod por entidad), domain/ (rachas, progreso,
                     recurrencia, conflictos, fechas), constants.ts
    server/
      index.ts  app.ts  config.ts
      db/            client.ts, schema/*.ts, migrations/ (SQL generado + FTS/triggers)
      lib/           errors.ts, validate.ts, tx.ts
      modules/<m>/   routes.ts, service.ts, service.test.ts
                     (tasks, projects, events, notes, habits, routines,
                      inbox, reminders, search, settings, dashboard, data)
      backup/        snapshot.ts, export.ts, import.ts
    client/
      main.tsx  app/ (router, layout AppShell, providers)
      components/ui/   Button, Input, Dialog, Sheet, Popover, Menu, Toast,
                       Checkbox, DatePicker, Select, EmptyState, Skeleton…
      components/      CommandPalette, QuickCapture, TagPicker, PriorityBadge…
      features/<m>/    pages, componentes y hooks (queries) por módulo
      lib/             api.ts, queryKeys.ts, shortcuts.ts, format.ts
      styles/          tokens.css, globals.css
  tests/e2e/         *.spec.ts (Playwright)
```

## 6. Pantallas, componentes y navegación

- **Shell**: sidebar en escritorio (Hoy, Inbox con contador, Tareas, Calendario, Notas, Diario, Proyectos, Hábitos; abajo Ajustes); en tablet sidebar colapsable; en móvil barra inferior (Hoy, Tareas, Calendario, Notas, Más) + botón de captura.
- **Hoy (`/`)**: saludo y fecha; bloques configurables (mostrar/ocultar/reordenar): Prioritarias y atrasadas, Agenda de hoy/próximos eventos, Hábitos y rutinas del día, Recordatorios, Proyectos activos (progreso), resumen pendientes/completadas, captura rápida.
- **Tareas (`/tasks/:view`)**: vistas hoy / próximas / atrasadas / completadas / todas; filtros (proyecto, etiqueta, prioridad, estado), orden, búsqueda; lista densa con completar en un clic; **panel lateral** de detalle (subtareas, checklist, etiquetas, recurrencia, recordatorio, notas vinculadas).
- **Calendario (`/calendar/:view/:date`)**: mes/semana/día; eventos, bloques de tiempo y tareas con fecha diferenciados por estilo (relleno sólido / rayado / chip con checkbox); crear arrastrando o con clic; aviso de conflicto; "Próximos".
- **Notas (`/notes`, `/notes/:id`)**: lista + editor; fijadas y favoritas arriba; archivo; etiquetas; guardado automático con indicador de estado y borrador local de respaldo.
- **Diario (`/journal/:date`)**: una entrada por día, navegación cronológica.
- **Proyectos (`/projects`, `/projects/:id`)**: resumen (estado, fechas, progreso, hitos) y pestañas Tareas / Notas / Calendario.
- **Hábitos (`/habits`, `/habits/:id`)**: hoy, cuadrícula de historial, rachas, objetivo semanal; rutinas con pasos.
- **Inbox (`/inbox`)**: lista con acciones convertir en tarea / nota / mover a proyecto / archivar.
- **Búsqueda**: paleta `Ctrl/⌘+K` (búsqueda + comandos) y página `/search?q=&type=` con filtros y estado sin resultados.
- **Ajustes (`/settings`)**: apariencia, preferencias (inicio de semana, zona horaria, formato), dashboard, datos (exportar JSON, copias, restaurar con validación y vista previa, papelera, borrar todo con confirmación tecleada).
- **Atajos**: `Ctrl/⌘+K` paleta, `C`/`Q` captura rápida global, `G` + `H/T/C/N/P/I` navegación, `N` nuevo en la vista actual, `X` completar tarea seleccionada, `J/K` mover selección, `?` ayuda de atajos.
- **Feedback**: skeletons de carga, estados vacíos con acción real, toasts discretos con **Deshacer** en completar/borrar, diálogos de confirmación para acciones destructivas.

Identidad visual: base neutra cálida (grises piedra), un único color de acento (índigo profundo) y colores semánticos para prioridad/estado; tipografía Inter variable empaquetada; escala de espaciado de 4 px; radios moderados; densidad tipo Linear; sin gradientes decorativos ni tarjetas anidadas.

## 7. IA local (solo arquitectura, no se implementa ahora)

- Módulo futuro `src/server/ai/`: cliente Ollama (`http://127.0.0.1:11434`, configurable; se rechazan hosts no-loopback salvo opt-in explícito). Modelo Qwen configurable. El núcleo funciona sin Ollama; la UI del asistente se oculta si no responde.
- **Herramientas tipadas** (Zod) que envuelven services existentes: lectura (`list_tasks`, `get_today`, `search_notes`, `get_project`…) y **propuestas** de escritura (`propose_tasks`, `propose_project_plan`). Nunca SQL ni acceso libre a la BD.
- Escrituras en dos pasos: el modelo devuelve una propuesta → la UI muestra un diff → el usuario confirma → el service ejecuta. Borrados nunca automáticos.
- Permisos por módulo en ajustes (qué datos puede leer el asistente); tabla `ai_audit_log` para cada llamada a herramienta.
- Preparación hecha desde ya: services como API interna única, esquemas Zod reutilizables como definición de herramientas, `content_text` y FTS para recuperación.

## 8. Fases de desarrollo

Reorganizo ligeramente la secuencia propuesta: **Proyectos se adelanta** (es el eje al que se vinculan tareas, eventos y notas; hacerlo tarde obligaría a rehacer formularios y vistas) y el **dashboard crece en cada fase** en vez de construirse de una vez. Cada fase termina con la app arrancando, tests en verde y README actualizado.

| #   | Fase                                                                                                                                                                                              | Depende de |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | Fundamentos: scaffold, tokens/tema, componentes UI base, shell y navegación responsive, BD+migraciones, manejo de errores, ajustes de tema, snapshot automático de BD, infra de tests, `git init` | —          |
| 2   | Tareas + etiquetas + Inbox + captura rápida + Dashboard v1 (tareas) + paleta de comandos (navegación)                                                                                             | 1          |
| 3   | Proyectos e hitos, vinculación tarea↔proyecto, progreso, dashboard: proyectos activos                                                                                                             | 2          |
| 4   | Calendario (3 vistas, recurrencia, bloques, conflictos, tareas programadas) + recordatorios + dashboard: agenda                                                                                   | 3          |
| 5   | Notas, diario, autoguardado, vínculos nota↔tarea/proyecto, búsqueda global FTS                                                                                                                    | 3          |
| 6   | Hábitos, rutinas, estadísticas; dashboard configurable completo                                                                                                                                   | 2          |
| 7   | Ajustes y datos: preferencias, exportar JSON, restaurar con validación, papelera, borrado total                                                                                                   | 1–6        |
| 8   | QA: E2E completos, accesibilidad, responsive, rendimiento, pulido visual, auditoría de "botones sin función", README final                                                                        | 1–7        |

### Criterios de aceptación por fase

1. `npm run dev` abre el shell en escritorio/móvil; navegación por teclado entre secciones (páginas vacías con estado vacío, sin botones inertes); tema claro/oscuro/sistema persiste tras recargar; la BD se crea en el directorio de datos con migraciones aplicadas; `npm test`, `npm run typecheck`, `npm run lint` pasan; un error de API forzado se muestra como toast legible.
2. Crear, editar, completar, reabrir y borrar (a papelera, con deshacer) una tarea; subtareas y checklist; las 5 vistas filtran correctamente según la zona horaria; tarea recurrente genera la siguiente al completar; captura rápida (`C`) en ≤2 pasos crea elemento de inbox y este se convierte en tarea; contadores del dashboard se actualizan sin recargar; datos persisten tras reiniciar el servidor.
3. CRUD de proyectos con estados; tareas asignadas aparecen en el proyecto; progreso cambia al completar una tarea; hitos completables; navegación proyecto → tareas.
4. Crear evento puntual, de día completo y recurrente (con editar "solo esta / todas"); verlos en mes/semana/día; bloque de tiempo visualmente distinto; tarea con fecha visible en el calendario; aviso de solapamiento; recordatorio dispara notificación del navegador y toast con la app abierta; dashboard muestra próximos eventos.
5. Nota con formato básico, etiquetas, fijar/favorito/archivar; autoguardado sin pérdida al cerrar pestaña; entrada de diario por fecha; nota vinculada a tarea y proyecto visible desde ambos lados; búsqueda global encuentra tareas/notas/proyectos/eventos, filtra por tipo y abre el elemento correcto; estado sin resultados.
6. Hábito diario y por días de semana; registrar/desmarcar día; racha, % y objetivo semanal calculados desde `habit_logs` (tests de unidad con casos límite: días no programados, cambio de semana, hoy sin registrar); rutina con pasos marcables; dashboard muestra pendientes del día; widgets se pueden ocultar/reordenar y persiste.
7. Exportar JSON con `schemaVersion`; restaurar en BD vacía reproduce los datos exactamente (test de ida y vuelta); archivo inválido/corrupto se rechaza con mensaje claro sin tocar datos; antes de restaurar se crea snapshot automático; operaciones destructivas exigen confirmación; inicio de semana afecta calendario y estadísticas.
8. Suite E2E de la sección 9 en verde en Chromium a 1440, 768 y 390 px; sin violaciones críticas de axe; recorrido completo solo con teclado; checklist de botones/enlaces sin función revisada; README completo.

## 9. Pruebas

- **Unidad (Vitest)**: dominio puro — rachas, progreso, expansión de recurrencias, conflictos, cálculo de "hoy/atrasada" con zonas horarias y cambio de horario (DST).
- **Integración API (Vitest + BD en memoria)**: cada service/ruta — validación (400 con campos), FK, papelera, export/import ida y vuelta, restauración de archivo inválido.
- **Componentes (Testing Library)**: formularios y validaciones de cliente.
- **E2E (Playwright, BD temporal por ejecución)**: tarea CRUD completo; evento visible en calendario; tarea + nota vinculadas a proyecto; hábito y estadísticas; búsqueda abre el resultado correcto; recarga → persistencia; exportar → borrar → restaurar; entradas inválidas; viewports; rastreo automático de botones/enlaces que no producen acción ni navegación.
- Regla: en cada entrega se informa qué está **implementado**, **probado (con el comando ejecutado)** y **pendiente**; nunca se afirma un test no ejecutado.

## 10. Datos, copias y configuración

- Directorio de datos: `LIFEHUB_DATA_DIR` o por defecto `~/.local/share/lifehub/` (`lifehub.db`, `backups/`). Fuera del repo para no perderlo ni commitearlo.
- Snapshots automáticos con la API de backup de SQLite al arrancar y cada día de uso (rotación configurable, p. ej. 14), y antes de cada restauración o migración.
- Export JSON (todas las entidades + settings + `schemaVersion`); import validado con Zod completo, en una transacción, con vista previa de conteos.
- `.env.example`: `PORT`, `HOST=127.0.0.1`, `LIFEHUB_DATA_DIR`, (futuro) `OLLAMA_URL`, `OLLAMA_MODEL`. Sin secretos.

## 11. Riesgos y decisiones

| Riesgo                                   | Mitigación                                                                                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `better-sqlite3` es nativo (compilación) | Node 24 tiene binarios precompilados; si falla, documentar `build-essential`/`python3`. Alternativa: `node:sqlite`.                                           |
| Recurrencias + zonas horarias + DST      | `rrule` + `@date-fns/tz`, expansión en servidor, tests específicos de DST.                                                                                    |
| Editor rico ↔ Markdown con pérdidas      | Limitar a formato básico (títulos, listas, checklist, negrita/cursiva, enlaces, código, citas) con tests de ida y vuelta.                                     |
| Calendario hecho a mano es costoso       | Vistas propias (sin librería pesada) acotadas a mes/semana/día; arrastrar para crear/mover en semana/día; redimensionar como mejora posterior si se complica. |
| Recordatorios sin la app abierta         | Limitación declarada; posible ampliación con PWA/servicio de sistema.                                                                                         |
| Alcance amplio                           | Fases cortas, cada una usable; nada de funciones "a medias" visibles en la UI.                                                                                |
| Pérdida de datos                         | Papelera, deshacer, snapshots, autoguardado, confirmaciones, migraciones con snapshot previo.                                                                 |
| Exposición en red                        | Servidor ligado a 127.0.0.1; sin CORS abierto.                                                                                                                |

## Fase 3 — Proyectos e hitos (completada el 2026-10-15)

**Implementado:**

- Módulo de proyectos (`src/server/modules/projects`): CRUD, hitos (crear/completar/borrar), progreso real = tareas de nivel superior completadas/totales (excluye subtareas y papelera; `null` —no 0%— cuando todavía no hay tareas), listado filtrable por estado, proyectos activos para el dashboard, papelera con restauración.
- Al borrar un proyecto, sus tareas se desvinculan (`projectId = null`) en vez de borrarse.
- Cliente: `/projects` (tarjetas con progreso, filtro por estado, alta rápida) y `/projects/:id` (cabecera editable: nombre, descripción, estado, prioridad, fechas; sección de hitos; pestañas Tareas/Notas/Calendario — Notas y Calendario muestran honestamente que llegan en las fases 5 y 4).
- Pestaña "Tareas" del proyecto reutiliza `TaskRow`/`TaskDetailSheet` ya construidos en la fase 2; selector de proyecto añadido al detalle de una tarea (antes no tenía UI aunque el campo ya existía desde la fase 1).
- Dashboard "Hoy": widget "Proyectos activos" conectado a datos reales.
- Sin tablas nuevas: `projects` y `milestones` ya existían desde la fase 1.

**Probado** (comandos ejecutados en esta sesión, todos en verde):

- `npx tsc --noEmit`, `npx eslint .` — sin errores.
- `npx vitest run` — 32/32 tests (7 nuevos de integración sobre SQLite real: progreso con/sin tareas, redondeo, exclusión de subtareas, filtro por estado, hitos, borrado con desvinculación, restauración).
- `npx playwright test` — 20/20 ejecutados (13 omitidos a propósito, mismo criterio que la fase 2): crear proyecto → vincular tareas → ver el progreso actualizarse en tiempo real, gestionar hitos, eliminar proyecto sin perder sus tareas.
- Verificado manualmente con `curl` contra una base de datos real: progreso 0/2 → 50% al completar una tarea, hitos, `/projects/active`, borrado con desvinculación, validación 400 con nombre vacío.
- **Bug real encontrado y corregido por un test E2E**: al añadir o completar una tarea desde la pestaña "Tareas" de un proyecto, el encabezado del proyecto (progreso, recuento) no se refrescaba — las mutaciones de tareas solo invalidaban las consultas de `tasks`, no las de `projects`, aunque el progreso se calcula a partir de las tareas. Corregido invalidando también `projects` en cualquier mutación de tareas.

**Pendiente / fuera de alcance de esta fase:**

- Verificación visual en navegador real (sin extensión de Chrome conectada en este entorno).
- Vincular notas y eventos a un proyecto (dependen de los módulos de Notas y Calendario, fases 4 y 5); las pestañas correspondientes ya existen en la UI con el aviso correcto.
- Asignar una tarea a un hito concreto (la columna `milestone_id` existe desde la fase 1, pero no se expone todavía en la interfaz; los hitos son, de momento, una lista independiente dentro del proyecto).
- Reordenar proyectos u hitos por arrastre.

## Fase 4 — Calendario y recordatorios (completada el 2026-10-15)

**Implementado:**

- Motor de recurrencia de eventos (`src/server/domain/calendar.ts`): recurrencia "amigable" (frecuencia + días de la semana + fecha límite opcional) traducida a RRULE real y reconstruida al editar; expansión de ocurrencias dentro de un rango usando `rrule`, con excepciones (`event_exceptions`) para cancelar o sobrescribir una ocurrencia concreta sin tocar el resto de la serie.
- Módulo de eventos (`src/server/modules/events`): crear, listar por rango (para las 3 vistas), próximos (para el dashboard), **editar/eliminar "solo esta ocurrencia" vs. "toda la serie"**, detección de conflictos horarios (excluye eventos de día completo y el propio evento al editar).
- Módulo de recordatorios (`src/server/modules/reminders`): crear, próximos, "vencidos" (para el sondeo del cliente), marcar disparado, descartar; asociables a una tarea o a un evento.
- Tareas con fecha límite visibles en el calendario (`GET /tasks/scheduled`), distinguidas visualmente de eventos y bloques de tiempo (chip verde con casilla, en vez del color de evento/bloque).
- Cliente: `/calendar` con vistas Mes/Semana/Día, navegación entre fechas, crear evento con un doble clic en la rejilla de horas, formulario completo (tipo evento/bloque de tiempo, día completo, recurrencia con selector de días de la semana, descripción, ubicación, proyecto, tarea, recordatorio, **aviso de conflicto en vivo** mientras se edita la hora), y los botones "Guardar/eliminar solo esta ocurrencia" vs. "toda la serie" para eventos recurrentes.
- `ReminderWatcher`: sondeo cada 20s de recordatorios vencidos; muestra un toast y, si el navegador lo permite, una notificación del sistema (limitación conocida y documentada: solo funciona con la app abierta).
- Sección "Recordatorio" en el detalle de una tarea (módulo C del plan: "recordatorios cuando la infraestructura lo permita" — ya lo permite).
- Dashboard "Hoy": widgets "Agenda de hoy" y "Recordatorios" conectados a datos reales.
- Sin tablas nuevas: `events`, `event_exceptions` y `reminders` ya existían desde la fase 1; esta fase solo añadió servicios, rutas y cliente sobre ellas.

**Probado** (comandos ejecutados en esta sesión, todos en verde):

- `npx tsc --noEmit`, `npx eslint .` — sin errores.
- `npx vitest run` — 45/45 tests (13 nuevos: 9 de eventos —expansión puntual/recurrente/día completo, edición y borrado "solo esta" vs. "toda la serie", conflictos— y 4 de recordatorios).
- `npx playwright test` — 23/23 ejecutados (28 omitidos a propósito, mismo criterio que fases anteriores): crear evento puntual y verlo en semana, evento de día completo en mes, editar "solo esta ocurrencia" de una serie semanal sin afectar a las demás, aviso de conflicto en vivo, navegación entre meses, recordatorio creado desde una tarea visible en el dashboard.
- Verificado manualmente con `curl` contra una base de datos real: creación puntual/día completo/recurrente, expansión semanal (lunes/miércoles/viernes), edición y borrado de una sola ocurrencia vs. toda la serie, detección de conflictos, recordatorios, tareas programadas.
- **Dos bugs reales encontrados y corregidos durante la verificación manual** (no solo "parecía funcionar"): (1) al editar "solo esta ocurrencia", el código devolvía el primer resultado de una consulta por rango sin filtrar por el evento correcto, pudiendo devolver un evento distinto que se solapara en el mismo instante — corregido filtrando por `eventId`; (2) un proceso de servidor de prueba anterior quedó "vivo" sirviendo una base de datos ya borrada (file descriptor abierto a un archivo desvinculado), lo que simuló un bug inexistente durante unos minutos — se documenta aquí como recordatorio de limpiar bien los procesos de prueba, no como un fallo de la aplicación.

**Pendiente / fuera de alcance de esta fase:**

- Verificación visual en navegador real (sin extensión de Chrome conectada en este entorno).
- Redimensionar/arrastrar eventos directamente en la rejilla (por ahora se crean con doble clic y se editan por formulario).
- Eventos de varios días con hora (el formulario asume que un evento con hora empieza y termina el mismo día; uno de día completo sí admite varios días).
- Gestionar un recordatorio ya existente de un evento desde el propio formulario de evento (se crea uno nuevo al crear el evento; para editarlo o añadir más, por ahora solo desde el detalle de una tarea). Se documenta como simplificación deliberada de esta fase.

## Fase 5 — Notas, diario y búsqueda global (completada el 2026-10-15)

**Implementado:**

- Editor de texto enriquecido (`RichTextEditor`, TipTap) con formato básico: títulos, listas, checklist, negrita/cursiva, enlaces, código, citas — tal como se previó en los riesgos de la fase 1. El contenido se guarda en **Markdown real** (decisión de la fase 1): `marked` convierte Markdown→HTML al cargar y `turndown` HTML→Markdown al guardar.
- Guardado automático con debounce (800ms) y un indicador de estado ("Guardando…"/"Guardado"/"Error al guardar"); se fuerza un guardado pendiente al desmontar o cerrar la pestaña para no perder texto.
- Módulo de notas (`src/server/modules/notes`): crear, editar, archivar, fijar, marcar como favorita, etiquetas (reutilizando el helper de etiquetas de tareas — extraído a `src/server/lib/tags.ts` para no duplicar lógica), papelera con restauración, vínculo con un proyecto, **vínculo bidireccional con tareas** (visible y desvinculable desde ambos lados).
- Diario: una entrada por fecha (restricción ya existente desde la fase 1), con un error 409 claro si se intenta duplicar.
- **Búsqueda global** (`src/server/modules/search`) sobre el índice FTS5 ya preparado en la fase 1: busca en tareas, notas, proyectos y eventos a la vez, con coincidencia por prefijo, filtro por tipo y fragmento resaltado; excluye automáticamente elementos borrados o archivados (lo hacían ya los triggers de la fase 1).
- Cliente: `/notes` (lista con filtros Todas/Fijadas/Favoritas/Archivadas y búsqueda local), `/notes/:id` (editor), `/journal` (navegación por fecha), `/search` (página dedicada con filtro por tipo y estado "sin resultados"), y la **paleta de comandos ampliada** con búsqueda de contenido en vivo (pendiente anotado desde la fase 2).
- Pestaña "Notas" de un proyecto ahora muestra contenido real (antes era un aviso de "llega en la fase 5"); selector de proyecto compartido extraído a `ProjectSelectField` para no duplicarlo entre tareas y notas.

**Probado** (comandos ejecutados en esta sesión, todos en verde):

- `npx tsc --noEmit`, `npx eslint .` — sin errores.
- `npx vitest run` — 59/59 tests (14 nuevos: 9 de notas —fijar/favorita/archivar, reutilización de etiquetas, diario único por fecha, vínculo bidireccional con tareas, notas de un proyecto, papelera— y 5 de búsqueda global sobre FTS5 real, incluyendo que lo borrado/archivado no aparece).
- `npx playwright test` — 28/28 ejecutados (38 omitidos a propósito, mismo criterio que fases anteriores): crear una nota con formato básico y verificar que persiste tras recargar (incluida la negrita), fijar/favorita/archivar moviendo entre filtros, diario persistente, vincular nota↔tarea y desvincular desde ambos lados, búsqueda global desde la paleta de comandos y la página dedicada con estado sin resultados.
- Verificado manualmente con `curl` contra una base de datos real: creación con etiquetas reutilizadas, diario duplicado (409), archivado excluyendo de la lista y de la búsqueda, notas de un proyecto, vínculo bidireccional con tareas, validación de etiquetas vacías.
- **Bug real encontrado y corregido durante la verificación manual**: crear una segunda entrada de diario para la misma fecha devolvía un 500 genérico (el error de restricción `UNIQUE` de SQLite no se traducía); corregido comprobando la existencia de la entrada antes de insertar y devolviendo un 409 con un mensaje claro.

**Pendiente / fuera de alcance de esta fase:**

- Verificación visual en navegador real (sin extensión de Chrome conectada en este entorno).
- División de código del bundle cliente: TipTap + marked + turndown duplicaron aproximadamente el tamaño del JS (653 KB → 1,13 MB sin comprimir). Sigue sin ser bloqueante para una app local, pero se revisará en la fase 8 como estaba previsto.
- Deep-link directo a un evento o a una ocurrencia concreta desde un resultado de búsqueda (los eventos abren el calendario en general, no el día exacto); los resultados de tipo tarea sí abren directamente el detalle correcto gracias a `?open=`.
- Editor de comentarios o wiki colaborativa: deliberadamente fuera de alcance (ver PLAN.md, módulo D).

## Fase 6 — Hábitos y rutinas; dashboard configurable (completada el 2026-10-16)

**Implementado:**

- Dominio puro (`src/shared/domain/habits.ts`): racha actual (un día no programado no cuenta ni rompe la racha; hoy sin registrar aún no rompe la racha), progreso del objetivo semanal según el inicio de semana de los ajustes, y la cuadrícula de historial de 70 días — todo sin I/O, con tests de unidad de los casos límite pedidos (días no programados, cambio de semana, hoy sin registrar).
- Módulos de servidor `src/server/modules/habits` y `src/server/modules/routines` (service + routes + tests de integración): CRUD, archivar/restaurar, registrar/desmarcar un día concreto (idempotente), listados "de hoy" para el dashboard; pasos de rutina marcables con su propio registro por fecha. Sin tablas nuevas: `habits`, `habit_logs`, `routines`, `routine_steps`, `routine_step_logs` ya existían desde la fase 1.
- Cliente `/habits`: tabs Hábitos/Rutinas, alta rápida, checkbox de hoy, racha, objetivo semanal, archivar/restaurar, pasos de rutina.
- Cliente `/habits/:id` (`HabitDetailPage.tsx`): nombre y descripción editables en línea, horario (diario o días concretos de la semana) y objetivo semanal editables, racha actual, y la cuadrícula de historial de 70 días (cada día es un botón que registra/desmarca esa fecha; los días no programados se muestran deshabilitados).
- Dashboard "Hoy" conectado y configurable: el widget "Hábitos de hoy" (`TodayPage.tsx`) ahora muestra los hábitos y pasos de rutina programados para hoy con su checkbox real, en vez del `EmptyState` fijo. Los bloques del dashboard se resuelven dinámicamente a partir de `settings.dashboardWidgets` (`dashboardWidgets.ts` con las etiquetas compartidas entre `TodayPage` y `SettingsPage`); se añadió un widget "Captura rápida" (abre el mismo diálogo que el atajo "C") para que el identificador `quick-capture`, presente en el esquema desde la fase 1 pero sin uso, tenga representación real.
- Ajustes (`/settings`): nueva sección "Dashboard" para mostrar/ocultar cada bloque y reordenar los visibles (botones subir/bajar), persistido en `settings.dashboardWidgets`.

**Probado** (comandos ejecutados en esta sesión, todos en verde):

- `npx tsc --noEmit`, `npx eslint .` — sin errores.
- `npx vitest run` — 88/88 tests (sin regresión; los nuevos de dominio de hábitos y de los módulos de servidor se añadieron en la sesión anterior de esta misma fase).
- `npx playwright test` — 28/28 ejecutados (38 omitidos a propósito, mismo criterio que fases anteriores); sin regresiones en calendario, notas, proyectos, shell ni tareas tras los cambios en `TodayPage`, `SettingsPage` y el router.
- Verificado manualmente con `curl` contra el servidor de desarrollo real: creación de un hábito con horario por días concretos, cuadrícula de historial de 70 días con `scheduled`/`done` correctos, edición de descripción, registrar/desmarcar el día de hoy (racha pasa a 1), archivar/restaurar, y `PATCH /api/settings` reordenando/ocultando `dashboardWidgets`.

**Pendiente / fuera de alcance de esta fase:**

- Verificación visual en navegador real (sin extensión de Chrome conectada en este entorno, igual que en las fases 4 y 5); se recomienda una pasada manual de UX antes de dar la fase por cerrada visualmente.
- Arrastrar para reordenar los widgets del dashboard (se implementó con botones subir/bajar, más simple y accesible por teclado).
- Color por hábito (`habits.color` existe en el esquema desde la fase 1 pero no se expone en la UI; no estaba pedido explícitamente en los criterios de aceptación de esta fase).

## Fase 7 — Ajustes y datos: exportación, restauración, papelera y borrado total (completada el 2026-10-16)

**Implementado:**

- Esquemas Zod de export/import (`src/shared/schemas/data.ts`): una fila "cruda" por cada una de las 20 tablas (incluida `meta`, que ya existía en el esquema desde la fase 1 pero no la usaba ningún servicio) más los ajustes, para que un export→import sea idéntico a los datos originales, no solo equivalente. `EXPORT_SCHEMA_VERSION` como constante en el propio JSON exportado.
- `src/server/backup/export.ts` (`exportData`, lectura cruda de todas las filas, incluidas las archivadas y las de la papelera) y `src/server/backup/import.ts`: `parseImportOrThrow`/`previewImport` (rechazan un archivo inválido o con una versión de esquema no compatible con un mensaje claro, sin tocar la BD), `restoreFromImport` (snapshot automático antes + transacción que vacía y reinserta las 20 tablas; `PRAGMA foreign_keys` se desactiva fuera de la transacción —SQLite no permite cambiarlo dentro de una— para poder reinsertar sin depender del orden exacto de referencias propias como las subtareas, con `foreign_key_check` dentro de la transacción como red de seguridad antes de confirmar) y `wipeAllData` (snapshot automático + vacía toda la BD + los ajustes vuelven a sus valores por defecto).
- `src/server/modules/data/service.ts` + rutas: `GET /data/export`, `POST /data/import/preview` (conteos sin escribir nada), `POST /data/import`, `POST /data/wipe`.
- Papelera unificada: `listTrash` añadido a los módulos de tareas, notas y proyectos (ya tenían restauración desde sus fases respectivas, pero ninguno exponía un listado); el módulo de eventos no tenía restauración en absoluto — se añadieron `restoreEvent` + `listTrash` + sus rutas.
- Cliente: sección "Datos" de Ajustes con exportar (descarga el JSON), restaurar desde un archivo (vista previa de conteos por tabla antes de confirmar, con copia de seguridad automática previa) y borrar todo (hay que escribir "BORRAR TODO" para habilitar el botón). Página `/trash` ("Papelera") con las 4 secciones (tareas/notas/proyectos/eventos) y botón "Restaurar" por elemento, enlazada desde Ajustes.
- Verificado (sin código nuevo) que el inicio de semana de los ajustes ya afecta al calendario (fase 4) y a las estadísticas de hábitos (fase 6).

**Probado** (comandos ejecutados en esta sesión, todos en verde):

- `npx tsc --noEmit`, `npx eslint .` — sin errores.
- `npx vitest run` — 93/93 tests (nuevos: `src/server/modules/data/service.test.ts` con export→wipe→import real sobre SQLite reproduciendo los datos exactamente incluidas etiquetas y vínculos nota↔tarea, vista previa sin escribir, archivo inválido/corrupto rechazado sin tocar datos existentes, wipe con ajustes a sus valores por defecto; más una aserción de papelera añadida a los tests de restauración ya existentes de tareas/notas/proyectos y un test nuevo de papelera+restauración para eventos).
- `npx playwright test` — 30/30 ejecutados (42 omitidos a propósito, mismo criterio que fases anteriores); nuevo `tests/e2e/data.spec.ts`: eliminar una tarea y restaurarla desde la Papelera, y el flujo completo exportar → eliminar → restaurar importando el archivo realmente descargado por el navegador (`page.waitForEvent("download")` + `setInputFiles`).
- Verificado manualmente antes de los tests automatizados: round-trip de export/import y wipe contra una base de datos SQLite real en un directorio temporal.

**Pendiente / fuera de alcance de esta fase:**

- Verificación visual en navegador real (sin extensión de Chrome conectada en este entorno, igual que en las fases 4-6); la cobertura E2E con Playwright real —incluida la descarga y subida real del archivo exportado— cubre el mismo flujo de forma automatizada.
- Borrado permanente de un elemento individual desde la Papelera (el plan solo pedía "papelera" + "restaurar", y por separado "borrar todo"; no un tercer estado intermedio).
- Preferencia de "formato" de fecha/número como ajuste separado (la sección de pantallas del plan la menciona de forma genérica junto a inicio de semana/zona horaria, ya existentes desde la fase 1; ningún criterio de aceptación la especifica, así que no se inventó un campo nuevo).

## Fase 8 — QA, accesibilidad y pulido (completada el 2026-10-17)

**Implementado:**

- `@axe-core/playwright` añadido (justificado por el criterio de aceptación #8) y `tests/e2e/a11y.spec.ts`: comprueba las 10 pantallas principales y la paleta de comandos sin violaciones críticas de axe.
- Corregidos 4 problemas reales de accesibilidad encontrados por ese pase (no previstos en el plan original, surgidos de la propia auditoría): `role="listbox"` incompleto (sin navegación por flechas real) en `CommandPalette.tsx` — se quitó, los botones ya son accesibles por teclado de forma nativa; contraste insuficiente de `--color-text-subtle` en modo claro y oscuro (`tokens.css`); contraste del rango horario de un evento por `opacity-80` (`WeekView.tsx`); `aria-label` ausente en el editor TipTap compartido por notas y diario (`RichTextEditor.tsx` + `NoteEditor.tsx`).
- `tests/e2e/shell.spec.ts`: nuevo test de un recorrido completo (navegar con el atajo "G T", crear una tarea con "N" + Enter, abrir su detalle, leer el título y cerrarlo con Escape) hecho enteramente con teclado, sin ningún `.click()`.
- `tests/e2e/habits.spec.ts` (nuevo): la sección 9 del plan pedía un flujo E2E de "hábito y estadísticas" que no existía — crear hábito, registrar hoy, racha visible en la tarjeta y en el detalle.
- Auditoría manual de botones/enlaces sin función en todo `src/client`: ninguno encontrado; única limitación conocida documentada (doble clic para crear evento en la rejilla del calendario, solo de ratón — el botón "Nuevo evento" es la vía equivalente por teclado).
- `README.md` reescrito: banner de estado (8 fases completadas, no solo la 1), secciones nuevas "Funcionalidades" y "Atajos de teclado", "Copias de seguridad y restauración" actualizada para reflejar que exportar/importar/papelera ya están implementados (fase 7), checklist de accesibilidad/QA de esta fase, "Limitaciones conocidas" sin los módulos ya implementados.

**Probado** (comandos ejecutados en esta sesión, todos en verde):

- `npx tsc --noEmit`, `npx eslint .` — sin errores.
- `npx vitest run` — 93/93 tests (sin cambios de dominio en esta fase).
- `npx playwright test` con `.e2e-data/` limpio — 43/43 ejecutados en los 3 viewports (68 omitidos a propósito, mismo criterio que fases anteriores); incluye los 11 tests nuevos de `a11y.spec.ts`, el nuevo test de teclado en `shell.spec.ts` y el nuevo `habits.spec.ts`.

**Pendiente / fuera de alcance de esta fase:**

- Verificación visual en navegador real (sin extensión de Chrome conectada en este entorno, igual que en fases anteriores); la cobertura E2E con Playwright real —incluida la de accesibilidad con axe— sustituye esa verificación visual.
- Métricas de rendimiento (Lighthouse, presupuestos de tamaño de bundle) y un rediseño visual: la fila de la tabla de fases menciona "rendimiento, pulido visual" pero ningún criterio de aceptación verificable los concreta, así que no se inventaron requisitos ni métricas nuevas.

## Fase 9 — Integraciones: notificaciones push y Google Calendar (en curso, iniciada el 2026-10-17)

**Nota sobre el alcance:** esta fase no estaba en el plan original de 8 fases; el usuario la pidió explícitamente tras completar la fase 8 ("sincronizar con Google Calendar... y lo de las notificaciones"). Introduce una excepción consciente a la regla de la sección "Riesgos y decisiones" / `AGENTS.md` de "sin servicios externos": ambas integraciones son **opt-in** (la app funciona igual sin activarlas) y sus credenciales viven solo en `.env`, nunca en el repo ni en el export JSON (que un usuario puede compartir o subir a cualquier sitio).

**Decisiones tomadas con el usuario:**

- Sincronización con Google Calendar **bidireccional**: crear/editar/borrar un evento en LifeHub lo sincroniza hacia Google y viceversa (no solo lectura).
- Notificaciones push (Web Push) y Google Calendar se desarrollan en paralelo, no una detrás de la otra.
- Política de conflicto bidireccional: "el cambio más reciente gana", comparando `updatedAt` local contra el `updated` que devuelve la API de Google por evento.

**Diseño (basado en el mapeo de la arquitectura existente — eventos, recurrencia, recordatorios, ajustes, export/import — hecho antes de escribir código):**

- Notificaciones: claves VAPID en variables de entorno (no en BD); tabla nueva `push_subscriptions` (una suscripción por navegador/dispositivo); un *service worker* que recibe el `push` y muestra la notificación aunque la pestaña esté cerrada; el servidor dispara el push desde el mismo punto que ya detecta recordatorios vencidos (`listDueReminders`), en vez de duplicar esa lógica.
- Google Calendar: tabla nueva `google_calendar_connection` (fila única, como `settings`) con los tokens OAuth; tabla nueva `google_event_links` que mapea `events.id` ↔ id de evento de Google (no se añade ningún campo a `events`, para no tocar el modelo ya probado de recurrencia/excepciones). El RRULE y el patrón serie+excepción de esta app encajan razonablemente con el modelo de instancias de Google, lo que simplifica la traducción.
- Las tablas nuevas con datos sensibles (tokens OAuth, claves de suscripción push) se excluyen deliberadamente del export JSON, pero sí se borran con "Borrar todo".

**Límite de lo que se puede verificar en este entorno:** no hay acceso a un proyecto real de Google Cloud ni a internet desde este entorno de desarrollo. El código se prueba con tests de integración (cliente de Google mockeado) y `typecheck`/`lint`/suite existente; la verificación end-to-end real contra una cuenta de Google y la recepción real de un push en un dispositivo las tiene que hacer el usuario con sus propias credenciales en `.env`. Se informará siempre qué está implementado/probado con mocks y qué queda pendiente de probar con credenciales reales.

**Estado:** implementada el 2026-10-17 (ver `odd/tasks/fase-9-integraciones.md` para el detalle de las 9 tareas).

**Implementado:**

- Notificaciones push: `web-push`, 3 rutas (`/push/public-key`, `/push/subscribe`, `/push/unsubscribe`), worker server-side cada 20s, *service worker* del cliente, botón "Activar" en Ajustes.
- Google Calendar: OAuth sin `googleapis` (REST directo), motor de sincronización bidireccional con política "el cambio más reciente gana", worker cada 5 min + botón "Sincronizar ahora", botones "Conectar"/"Desconectar" en Ajustes.
- 3 tablas nuevas (`push_subscriptions`, `google_calendar_connection`, `google_event_links`), excluidas del export JSON pero borradas con "Borrar todo".

**Probado** (comandos ejecutados en esta sesión, todos en verde):

- `npx tsc --noEmit`, `npx eslint .` — sin errores.
- `npx vitest run` — 119/119 (26 nuevos: 6 de push con `web-push` mockeado, 10 de OAuth con `fetch` mockeado, 10 del motor de sync con `fetch` mockeado — cubren creación/edición/borrado en ambos sentidos, conflicto por `updatedAt`, cancelación y `syncToken` caducado).
- `npx playwright test` con `.e2e-data/` limpio — 43/43 ejecutados en los 3 viewports (68 omitidos por diseño); axe sin violaciones nuevas en la pantalla de Ajustes con las dos secciones nuevas.

**Pendiente — no verificable desde este entorno (sin acceso a internet ni a una cuenta real de Google):**

- Conectar con una cuenta de Google real de verdad y confirmar que la sincronización bidireccional funciona contra la API real (lo probado aquí usa un `fetch` mockeado).
- Recibir un push real en un dispositivo/navegador real con las claves VAPID generadas por el usuario.
- El usuario debe crear sus propias credenciales en Google Cloud Console y las claves VAPID, y añadirlas a su `.env` (instrucciones en `README.md` → "Integraciones"); no se pudo tocar `.env.example` directamente (bloqueado por los permisos de este entorno de desarrollo para archivos `.env*`).

**Fuera de alcance explícito:**

- Sincronización en tiempo real vía webhooks (exigiría una URL pública; el servidor solo escucha en `127.0.0.1`) — se usa sondeo periódico + botón manual.
- Sincronización de excepciones de una sola ocurrencia de una serie recurrente (Google las modela como un recurso de "instancia" distinto); se sincroniza la serie completa.
- Varios calendarios de Google a la vez; multi-usuario.

## Fase 10 — Revisión periódica, GitHub por proyecto y finanzas con metas (completada el 2026-10-19)

**Nota sobre el alcance:** esta fase tampoco estaba en el plan original; el usuario la pidió tras cerrar la fase 9, respondiendo a una pregunta exploratoria sobre qué echaba en falta para el día a día (proyectos, carrera, trabajo). De las tres propuestas planteadas ("resumen temporal periódico", "GitHub de solo lectura", "finanzas manuales"), el usuario confirmó las tres ("Hazlas todas") con dos refinamientos explícitos: GitHub debía ser "general, no ir tras commit" (resumen por proyecto, no un listado commit a commit) y finanzas debía incluir metas de dinero con asignación de aportaciones. Detalle completo de specs y diseño en `odd/tasks/fase-10-revision-github-finanzas.md`.

**Diseño:**

- **Revisión periódica** (`/review`): sin tabla nueva — agrega datos ya existentes al vuelo (tareas completadas/creadas, cumplimiento de hábitos, proyectos activos con progreso e hitos completados, notas/diario creadas, aportación neta de finanzas) para el rango semana/mes actual. Deliberadamente no incluye actividad de GitHub: traer datos de una API externa en cada carga de una vista agregada la haría lenta y frágil.
- **GitHub por proyecto**: columna `githubRepo` (`owner/repo`) en `projects`; `GITHUB_TOKEN` como variable de entorno opcional (mismo patrón que `config.google`/`config.webPush` de la fase 9); llamadas REST directas a `api.github.com` (sin el paquete `octokit`, mismo criterio que `googleapis` en la fase 9) para un resumen general (último commit, actividad de los últimos 30 días), nunca un listado commit a commit.
- **Finanzas con metas**: 3 tablas nuevas (`finance_assets`, `finance_goals`, `finance_entries`) con cantidades en céntimos enteros (nunca `real`/float, para no depender de redondeo de coma flotante con dinero); una entrada es siempre "metí/retiré X en la fecha Y", sin precios en vivo ni valoración de mercado; asignación opcional de cada aportación a una meta. A diferencia de las tablas de la fase 9 (credenciales), las de finanzas son contenido normal y se incluyen en el export/import JSON.

**Estado:** implementada el 2026-10-19 (ver `odd/tasks/fase-10-revision-github-finanzas.md` para el detalle de las 11 tareas).

**Implementado:**

- Finanzas: CRUD completo de activos/metas/entradas (`/finance/*`), página `/finance` (activos con balance y movimientos recientes, metas con barra de progreso, diálogos de alta con asignación opcional a meta), papelera a nivel de servicio para activos/metas (igual que proyectos).
- GitHub: `GET /projects/:id/github-activity` (resumen general, nunca lanza — una API externa caída no rompe la pantalla del proyecto, solo muestra el motivo), pestaña "GitHub" en el detalle de proyecto, badge de solo lectura "GitHub: configurado/no configurado" en Ajustes → Integraciones.
- Revisión: `GET /review/summary?period=week|month`, página `/review` con selector de periodo, tarjetas de tareas/hábitos/notas/finanzas, lista de proyectos activos y metas con su progreso.
- Export/import/wipe: las 3 tablas de finanzas añadidas como contenido normal.

**Probado** (comandos ejecutados en esta sesión, todos en verde):

- `npx tsc --noEmit`, `npx eslint .` — sin errores.
- `npx vitest run` — 153/153 (28 nuevos: 4 de `getPeriodRange`, y un `service.test.ts` de revisión que cubre las 5 funciones de rango nuevas — `countCompletedInRange`/`countCreatedInRange` en tareas, `getCompletionStats` en hábitos, `countCreatedInRange` en notas, `countMilestonesCompletedInRange` en proyectos, `getNetContributionsInRange` en finanzas — más un smoke test de `getSummary`).
- `npx playwright test` con `.e2e-data/` limpio — 45/45 ejecutados en los 3 viewports (72 omitidos por diseño, +2 respecto a la fase 9 por las 2 pantallas nuevas en `a11y.spec.ts`: `/finance` y `/review`); axe sin violaciones críticas en ninguna de las dos.

**Pendiente — no verificable desde este entorno (sin acceso a internet ni a un repo real de GitHub):**

- Confirmar el resumen de actividad contra un repo de GitHub real con un `GITHUB_TOKEN` válido (lo probado aquí usa `fetch` mockeado).

**Fuera de alcance explícito:**

- Actividad de GitHub dentro de la revisión periódica (decisión deliberada, no omisión — ver "Diseño").
- Valoración de mercado o precios en vivo en finanzas (solo registro manual de aportaciones/retiros).
- Varios repos de GitHub por proyecto; un listado commit a commit.

## Fase 11 — Mercados: noticias de crypto/acciones y objetivos de precio (completada el 2026-10-19)

**Nota sobre el alcance:** fase no planificada originalmente; pedida directamente por el usuario tras cerrar la fase 10. Antes de diseñar se confirmó con el usuario la única decisión de producto real abierta — la fuente de datos — entre dos alternativas con tradeoffs claros: solo APIs/RSS sin clave (sin `.env` nuevo, cobertura algo más limitada) vs. APIs con clave (NewsAPI/Alpha Vantage/Finnhub, mejor cobertura, requiere gestionar API keys). El usuario eligió la primera. Detalle completo en `odd/tasks/fase-11-mercados-noticias.md`.

**Diseño:**

- Lista de seguimiento nueva (`watchlist_assets`), separada de las finanzas de la fase 10 a propósito: esas tablas excluyen deliberadamente precios en vivo (ver "Fuera de alcance" de la fase 10); mezclarlas rompería esa decisión.
- Cotizaciones sin API key: CoinGecko (`/api/v3/simple/price`) para cripto, endpoint público (no documentado oficialmente) de Yahoo Finance (`query1.finance.yahoo.com/v8/finance/chart`) para acciones. Caché en memoria de pocos minutos para no saturar los endpoints gratuitos.
- Noticias sin API key: feeds RSS de medios de crypto y de mercados, parseados con `fast-xml-parser` (dependencia nueva, justificación: parsear RSS/Atom a mano con regex es frágil; es una librería pequeña, sin dependencias de runtime). Caché en memoria de ~15 min.
- Igual que GitHub en la fase 10: una API/feed externo caído nunca rompe la pantalla, solo se muestra el motivo en vez del dato.
- Objetivo de precio sin campo de "dirección" (no pedido): se asume el uso habitual de un price target (precio al que se espera que suba el activo), por eso "alcanzado" es `current >= target`. Documentado como simplificación deliberada en `odd/tasks/fase-11-mercados-noticias.md`.

**Estado:** implementada el 2026-10-19 (ver `odd/tasks/fase-11-mercados-noticias.md` para el detalle de las 11 tareas).

**Implementado:**

- Lista de seguimiento: CRUD completo (`/markets/watchlist/*`), papelera a nivel de servicio (igual que activos/metas de finanzas), página `/markets` con diálogo de alta (tipo, símbolo, nombre, objetivo opcional) y tarjetas con cotización actual, objetivo y % de distancia.
- Cotizaciones: `GET /markets/quotes` — CoinGecko en un único batch para toda la cripto, Yahoo Finance (endpoint no oficial, requiere User-Agent de navegador) en paralelo por acción; caché en memoria de 2 min; nunca lanza.
- Noticias: `GET /markets/news` — CoinDesk + Cointelegraph (crypto) y MarketWatch (acciones) vía RSS, caché en memoria de 15 min; pestañas Crypto/Acciones en la UI.
- Export/import/wipe: `watchlist_assets` añadida como contenido normal (como las finanzas de la fase 10, no como las credenciales de la fase 9).

**Probado** (comandos ejecutados en esta sesión, todos en verde; a diferencia de las fases 9/10, aquí SÍ hubo acceso real a internet desde este entorno):

- `npx tsc --noEmit`, `npx eslint .` — sin errores.
- `npx vitest run` — 172/172 (19 nuevos: 4 de `computeTargetProgress`, 5 de CRUD de la watchlist, 6 de cotizaciones y 4 de noticias, todos con `fetch` mockeado).
- `npx playwright test` con `.e2e-data/` limpio — 46/46 ejecutados en los 3 viewports (74 omitidos por diseño, +2 por `/markets` en `a11y.spec.ts`); axe sin violaciones críticas.
- Smoke test manual contra el servidor real y las APIs/feeds reales (no mockeados): cotizaciones correctas de BTC (CoinGecko) y AAPL (Yahoo Finance); 20 noticias de crypto y 10 de acciones obtenidas y parseadas. Se encontró y corrigió un bug real en esta prueba: `fast-xml-parser` no decodifica referencias de carácter HTML (`&#x2019;`) sin `htmlEntities: true`.

**Pendiente — no verificable desde este entorno (sin navegador conectado):**

- Interacción real en el navegador (Claude in Chrome no está conectado aquí); la cobertura de UI se apoya en el smoke test de API real contra el servidor en marcha, la suite de accesibilidad de Playwright y la revisión de código.

**Fuera de alcance explícito:**

- Alertas/notificaciones cuando se alcanza un objetivo de precio (no pedido; ver fase 9 para el mecanismo de notificaciones push ya existente si se quisiera añadir después).
- Dirección del objetivo (comprar por debajo vs. vender por encima) — ver "Diseño".
- Varias divisas; todo se cotiza en USD (lo que devuelven CoinGecko/Yahoo Finance por defecto).

## Fase 12 — Despliegue en VPS (completada el 2026-10-19)

**Nota sobre el alcance:** fase no planificada originalmente; el usuario quiere subir LifeHub a su VPS, igual que ya tiene desplegado otro proyecto propio (ViperTrade) ahí. Se revisó ese despliegue real (no se asumió nada): ViperTrade corre con **systemd + proceso directo**, sin Docker, aunque el repo también tiene un `Dockerfile`/`docker-compose` que solo se usa para desarrollo local. Dado que la decisión de enfoque se dejó a mi criterio, se eligió mantener consistencia (systemd + Node directo) en vez de introducir Docker, por menor huella en un VPS con RAM limitada y porque no hay ninguna necesidad real (aislamiento, multi-entorno) que lo justifique aquí.

**Diseño:**

- `deploy/lifehub.service` + `deploy/README.md`, mismo patrón que `ViperTrade/deploy/`: unidad systemd con `EnvironmentFile=.env`, `Restart=always`, límites de memoria ajustables.
- Las migraciones ya se aplican solas al arrancar (`runMigrations()` en `src/server/index.ts`); el despliegue no necesita un paso manual de `db:migrate`.
- Bug real encontrado durante el diseño (no al desplegar, porque aquí no hay VPS real accesible): `CLIENT_ORIGIN` en `googleCalendar/routes.ts` se calculaba como `http://{config.host}:{config.port}` en producción. Detrás de un reverse proxy, `config.host` es `127.0.0.1` (correcto para el *bind* del proceso, pero inalcanzable desde el navegador del usuario para la redirección post-login de Google). Corregido con una variable nueva, `LIFEHUB_PUBLIC_URL`, que tiene prioridad cuando está configurada; sin ella, el comportamiento no cambia (compatible con los despliegues locales ya existentes).

**Estado:** implementada el 2026-10-19.

**Implementado:**

- `src/server/config.ts`: `config.publicUrl` desde `LIFEHUB_PUBLIC_URL`.
- `src/server/modules/googleCalendar/routes.ts`: `CLIENT_ORIGIN` usa `config.publicUrl` con prioridad sobre el cálculo anterior.
- `deploy/lifehub.service`, `deploy/README.md`: unidad systemd + guía paso a paso (clonar, instalar, `.env`, systemd, Caddy/dominio+HTTPS, actualización, backups).
- `README.md`: nueva variable `LIFEHUB_PUBLIC_URL` en la tabla de configuración, sección "Despliegue en un VPS" con puntero a `deploy/README.md`, y nota en "Google Calendar" sobre el caso de producción con dominio.

**Probado:**

- `npx tsc --noEmit`, `npx eslint .` — sin errores.
- `npx vitest run` — 172/172 (sin tests nuevos: el cambio es un `??` adicional sobre una variable de entorno opcional, sin lógica nueva que probar unitariamente; cubierto por revisión de código).

**Despliegue real ejecutado el 2026-10-19** (mismo VPS que ViperTrade; dirección obtenida de `ViperTrade/.claude/settings.json`, autorización ya concedida por el usuario para administración de ese VPS, ampliada explícitamente a este despliegue):

- `/opt/lifehub` nuevo, servicio `lifehub.service` nuevo — no se tocó ViperTrade ni su configuración de nginx.
- **Bug real encontrado al desplegar, no al diseñar:** el servicio arrancaba y se caía (`segfault`, código 139) al abrir la base de datos. Diagnóstico con `gdb`: el crash ocurre dentro de Node al registrar el módulo nativo de `better-sqlite3` (`napi_module_register_by_symbol`). Causa real: **`better-sqlite3@13.0.3` exige Node ≥22** (`npm warn EBADENGINE`); el VPS tenía Node 20.20.2 — por eso el binario nativo se cae en vez de dar un error controlado. El requisito documentado hasta ahora ("Node 20 o superior") era incorrecto. Corregido: Node del VPS actualizado a 24.x vía NodeSource, `README.md`/`deploy/README.md` corregidos a "Node ≥22", y añadido `engines.node >= 22` a `package.json` para que `npm install` avise pronto en vez de fallar en caliente.
- Verificado tras el fix: servicio `active`/`enabled`, `GET /api/settings` responde con datos reales, copia de seguridad de arranque creada, ~87M de memoria en uso (holgado dentro del límite de 350M del `MemoryMax`).
- Deuda pendiente para no bloquear este despliegue: el `.env` de producción solo tiene `LIFEHUB_HOST`/`LIFEHUB_PORT`/`LIFEHUB_DATA_DIR` — sin dominio ni reverse proxy todavía, por lo que Google Calendar/GitHub/push siguen sin configurar en el VPS (el usuario los añadirá cuando decida el dominio). La clave SSH del VPS hacia GitHub es un *deploy key* específico de `ViperTrade` (confirmado: `ssh -T git@github.com` desde el VPS devuelve "Hi alejandrorodm/ViperTrade!", no el usuario), así que no puede hacer `git clone`/`git pull` de `Lifehub`; el código se transfirió con `git archive | ssh ... tar -x` en vez de clonar. "Actualizar LifeHub" en `deploy/README.md` (que asume `git pull`) no funcionará hasta que se añada un deploy key de GitHub para este repo en el VPS, o se cambie el procedimiento de actualización a repetir ese `git archive`.

**Fuera de alcance explícito:**

- Docker/docker-compose para LifeHub (decisión: mantener consistencia con el despliegue real de ViperTrade en el mismo VPS, no con su `Dockerfile` de solo desarrollo).
- CI/CD automático (despliegue manual vía `git pull` + `systemctl restart`, igual que ViperTrade).
- HTTPS/Caddy como parte de este repo: se documenta el bloque de configuración pero la instalación de Caddy es responsabilidad del VPS, no de LifeHub.

## Fase 13 — Perfiles con login (completada el 2026-10-19)

**Nota sobre el alcance:** fase no planificada originalmente; pedida por el usuario al preguntar por la URL del despliegue de la fase 12. Antes de diseñar se confirmó con el usuario (pregunta enfocada, única decisión de producto real abierta) el alcance: "acceso compartido" (un login delante de los mismos datos) vs. "datos totalmente separados" (cada perfil con su propia información). El usuario eligió la segunda — es un cambio arquitectónico grande, detallado completo en `odd/tasks/fase-13-perfiles-multiusuario.md`.

**Diseño:** ver el documento de la fase para el detalle completo (tabla `users`, `scrypt` + cookie firmada con `sessionVersion` para invalidar de verdad al cerrar sesión, `AsyncLocalStorage` para propagar el `userId` sin tocar la firma de cada función de cada `service.ts`, `userId` directo en cada tabla de contenido en vez de depender de JOINs de autorización).

**Estado:** T1-T17 completados. Fase cerrada por completo: desplegada en producción (`https://lifehub.alejandrorodm.com`) y con la suite de tests (antigua adaptada + nuevos tests de aislamiento entre perfiles) en verde.

**Implementado y probado hasta ahora:**

- T1-T5: `npx tsc --noEmit`, `npx eslint .`, `npx vitest run` (194/194), `npx playwright test` (46/46, 74 omitidos por diseño) — todos en verde; verificación real contra producción (login de Ioana y Alex, cookie de sesión, 401 sin sesión). Dominio `lifehub.alejandrorodm.com` (Namecheap) + nginx + certbot en el VPS compartido con ViperTrade.
- T6-T15: `npx tsc --noEmit` y `npx eslint .` limpios en todo el código de producción; migración `0005_new_wild_child.sql` probada de extremo a extremo (BD nueva y BD con datos reales existentes).
- T17: suite de tests adaptada (`enterWithUserId` en `lib/requestContext.ts`, fijado en el `beforeEach` de cada archivo — no hizo falta envolver cada `it()`) + tests nuevos de aislamiento entre perfiles en tasks/projects/settings/search. `npx vitest run` 203/203, `npx playwright test` 46/46.
- Hallazgos reales durante los tests/revisión propios (no al diseñar): cookie de sesión seguía siendo válida tras "cerrar sesión" (corregido con `sessionVersion`); varias funciones de `restore`/`update` no comprobaban el dueño antes de actuar (IDOR); el índice de búsqueda global (FTS5) no tenía `userId` (habría mezclado resultados de ambos perfiles); las notificaciones push de un recordatorio se enviaban a los dispositivos de **ambos** perfiles; "Borrar todo"/restaurar un import afectaban a la base de datos entera, no solo al perfil que los pedía. Detalle completo de cada uno en el log de la tarea.

**Desplegado y verificado en producción el 2026-10-19:** el VPS no tenía datos reales (todas las tablas de contenido vacías), así que la migración no tuvo nada que retropoblar. Prueba real contra `lifehub.alejandrorodm.com` (no solo en el código): login de Ioana y Alex, Ioana crea una tarea, la ve en su lista, Alex no la ve en la suya.

## Fase 14 — APK (TWA con Bubblewrap) (completada el 2026-10-19)

**Nota sobre el alcance:** pedida por el usuario junto con la fase 13, con instrucción explícita de instalar lo necesario y terminarlo de forma autónoma. Elegido TWA (Trusted Web Activity) sobre Capacitor: LifeHub ya tiene service worker (fase 9, push), no hay nada que empaquetar aparte — la TWA carga siempre el sitio en vivo, así que las actualizaciones normales de la app no requieren tocar la APK en absoluto, que es exactamente lo que pidió el usuario ("que pueda actualizarse directamente sin tener que reinstalar").

**Implementado:**

- `src/client/public/manifest.webmanifest` + iconos (`src/client/public/icons/`, generados con un codificador PNG propio de ~80 líneas en vez de añadir una dependencia o depender de herramientas del sistema que no estaban disponibles) + enlazado en `index.html`.
- `src/server/lib/assetLinks.ts` + ruta `GET /.well-known/assetlinks.json` (fuera de `/api`, sin sesión) — Digital Asset Links, ya con la huella SHA-256 real del keystore de firma, para que la TWA abra a pantalla completa.
- `deploy/android/twa-manifest.json` (config de Bubblewrap, generado con todos los valores por defecto reales de la librería, no a mano) + `deploy/android/generate-project.cjs` (genera el proyecto Android sin el asistente interactivo, que exige una terminal real) + `deploy/android/README.md`.
- `.gitignore`: excluidos el keystore, la contraseña, y todo el proyecto Android generado (`app/`, `build.gradle`, `gradlew`...) — se recrea desde `twa-manifest.json` + `generate-project.cjs`, igual que `dist/`.

**JDK y Android SDK instalados sin root, en esta sesión:**

- Ni esta máquina (sin `sudo` sin contraseña) ni el VPS (RAM demasiado justa para arriesgar los servicios en producción) permitían instalar paquetes del sistema. Se descargó un JDK 17 portátil (Temurin, tarball oficial) y el Android SDK (cmdline-tools + platform-tools + `platforms;android-36` + `build-tools;36.1.0`) directamente en `~/.local/lifehub-tools/`, sin tocar el sistema.
- `bubblewrap build` exige una terminal real para varios asistentes interactivos (JDK/SDK la primera vez, confirmar regenerar el proyecto, contraseñas del keystore) que no funcionan en este entorno ni con la entrada redirigida (el proceso cierra el `readline` en cuanto deja de haber una TTY real). Se resolvió sin tocar el propio bubblewrap: `~/.bubblewrap/config.json` escrito a mano (evita el asistente de JDK/SDK), `BUBBLEWRAP_KEYSTORE_PASSWORD`/`BUBBLEWRAP_KEY_PASSWORD` por variable de entorno (evita el de contraseñas), y `generate-project.cjs`, que llama a la librería `@bubblewrap/core` directamente (la misma que usa el asistente por debajo) para generar el proyecto sin preguntar nada.
- Hallazgo real durante el build (no al diseñar): `minSdkVersion` por defecto (21) es menor que el mínimo que exige la librería `androidbrowserhelper` (24) — build fallaba con un error de fusión de manifests. Corregido fijando `minSdkVersion: 24`.
- Keystore de firma (`android.keystore`, alias `lifehub`) generado una sola vez con `keytool`, contraseña aleatoria fuerte guardada en `~/.local/lifehub-tools/lifehub-keystore-password.txt` (permisos 600, fuera del repo) — es lo único que permite publicar actualizaciones de la APK sin que Android obligue a desinstalar.
- Para no desplegar a producción el trabajo a medias de separación de datos (fase 13) solo para poder generar los iconos de la APK, se montó el sitio en local (`npm run build && npm start`, puerto aislado) y se apuntó la generación ahí; el `twa-manifest.json` final y el proyecto Android generado sí referencian el dominio real (`lifehub.alejandrorodm.com`).

**Resultado:** `app-release-signed.apk` (~977&nbsp;KB) y `app-release-bundle.aab` generados y firmados correctamente (verificado con `apksigner verify --print-certs`). No se commitean (binarios generados, excluidos).

**Pendiente:**

- La pantalla completa (sin barra de Chrome Custom Tabs) solo funcionará una vez que el código de las fases 13/14 esté desplegado en `lifehub.alejandrorodm.com` — en el momento de generar esta APK el servidor de producción todavía tenía el código anterior (`/.well-known/assetlinks.json` ahí no tiene la huella real todavía).
- Backup del keystore y su contraseña fuera de esta máquina: responsabilidad del usuario (documentado en `deploy/android/README.md`, no es algo que yo pueda hacer por él).

## Fase 15 — Navegación móvil minimalista y ajuste de vistas a móvil (completada el 2026-10-20)

**Nota sobre el alcance:** fase no planificada originalmente; pedida por el usuario tras usar la app en móvil ("tiene que ser más minimalista... y adaptarlas a interfaz móvil lo máximo posible"). Antes de diseñar se confirmó con el usuario (pregunta enfocada) qué secciones quedan fijas en la barra inferior; el usuario eligió Hoy/Inbox/Tareas/Calendario y pidió además poder ocultar secciones que no usa, y un rediseño general de las vistas que no se ajustan bien a móvil. Detalle completo en `odd/tasks/fase-15-nav-movil.md`.

**Implementado y probado (T1-T4):**

- Barra inferior móvil reducida a 4 secciones fijas (Hoy/Inbox/Tareas/Calendario) + botón "Más" que abre una hoja con el resto; antes se amontonaban las 12 secciones en una fila con scroll horizontal.
- Nueva preferencia `visibleNavSections` en ajustes (mismo patrón que `dashboardWidgets`: mostrar/ocultar/reordenar) para que cada usuario oculte las secciones que no le interesan; sigue accesible desde la paleta de comandos (⌘K) aunque esté oculta del menú.
- `Sheet` (panel de detalle/menú) ahora se ancla abajo en móvil en vez de deslizar desde la derecha; formularios en modal (`EventFormDialog`, `TaskDetailSheet`, resumen de importación en Ajustes) pasan a una columna en pantallas estrechas.
- `npx tsc --noEmit`, `npx eslint .`, `npx vitest run` (205/205) en verde; `playwright test` de `shell.spec.ts`, `calendar.spec.ts`, `tasks.spec.ts` y `a11y.spec.ts` en verde (Desktop; Tablet/Mobile omitidos por diseño en los specs funcionales).

**T5 (calendario):** el usuario eligió "vista de un día" (navegación con flechas anterior/siguiente) frente a mantener semana/mes comprimida. La app ya tenía ese modo de vista; ahora se fuerza como vista por defecto y única en móvil (incluso con un enlace que pida semana/mes) y se oculta el selector Mes/Semana/Día, redundante en ese ancho. Nuevo hook `useIsMobile` (mismo breakpoint `md`=768px que el resto del shell).

**Verificación final:** `npx tsc --noEmit`, `npx eslint .`, `npx vitest run` (205/205) y `npm run test:e2e` completo (52/52 en Desktop; Tablet/Mobile omitidos por diseño salvo en los specs de layout, que corren en los 3 viewports) en verde contra una base de datos de pruebas limpia.

## Fase 16 — Planificación diaria, línea de tiempo y sistema visual (en curso desde el 2026-10-26)

**Nota sobre el alcance:** fase propuesta tras el análisis de la competencia (Todoist, Sunsama, Akiflow, Structured) y aprobada por el usuario. Objetivo: que la app pase de "lista de tareas" a "planificar el día", y darle una identidad visual propia y pulida sin añadir secciones a la navegación (se mantiene la barra minimalista de la fase 15).

**Decisiones de diseño (tomadas, corregibles):**

- El día planificado de una tarea es su `dueDate`. Una tarea planificada en un hueco tiene además `scheduledStart` (HH:mm) y `estimatedMinutes` (duración; por defecto 30 min en la UI).
- Sin `scheduledStart` la tarea aparece en la lista "Sin planificar" de su día. `dueTime` se mantiene como hora límite, distinta de la hora planificada.
- La línea de tiempo cubre 07:00–22:00. La capacidad del día es fija en 8 h (480 min) y se muestra como barra; superarla avisa, no bloquea.
- Ruta `/plan`. No añade entrada a la barra de navegación: se llega desde el Hoy, desde Tareas y con `G P` / ⌘K.
- Temporizador de foco: estado en memoria de la pantalla (sin persistencia), para no añadir tablas.
- Tipografía de titulares: `@fontsource-variable/fraunces`, empaquetada localmente (sin CDN). Justificación: identidad visual propia y cálida, coherente con los neutros de piedra de los tokens; sin gradientes ni decoración (AGENTS.md).

**Tareas:**

| ID  | Tarea | Ruta | Estado |
| --- | ----- | ---- | ------ |
| T1  | Dominio puro de planificación (`src/shared/domain/planning.ts`): cálculo de capacidad, solapes y colocación de bloques en la línea de tiempo. Tests primero (RED). | inline | pendiente |
| T2  | Esquema y migración drizzle: `scheduled_start`, `estimated_minutes` en `tasks`; DTO, PATCH y servicio. | inline | pendiente |
| T3  | API: `GET /tasks/plan?date=` (planificadas, sin planificar, atrasadas) y `POST /tasks/plan/carry-over` (mover pendientes de un día a otro). | inline | pendiente |
| T4  | Página `/plan`: línea de tiempo, lista "Sin planificar", barra de capacidad, diálogo para programar un bloque, estados de carga/vacío/error. | inline | pendiente |
| T5  | Cierre del día (mover pendientes a mañana) y temporizador de foco por bloque. | inline | pendiente |
| T6  | Sistema visual: escala tipográfica con Fraunces en titulares, componentes `PageHeader` y `Card`, aplicación a Hoy, Tareas y Plan; revisión en claro/oscuro y móvil. | inline | pendiente |
| T7  | Cierre: `typecheck`, `lint`, `test`, `test:e2e` reales; estado de la fase actualizado. | inline | pendiente |

**Criterios de aceptación (verificables):**

- Planificar una tarea en un hueco la hace aparecer en la línea de tiempo de ese día y desaparecer de "Sin planificar"; recargar la página la mantiene.
- Dos bloques que se solapan se muestran lado a lado, sin ocultarse.
- "Cerrar el día" mueve al día siguiente solo las tareas abiertas de ese día; las completadas no se tocan.
- La capacidad refleja la suma de `estimatedMinutes` de las tareas planificadas ese día.
- Ninguna lista nueva carece de estado de carga, vacío y error (AGENTS.md).
- Textos de UI en español; código y commits en inglés (Conventional Commits).

**Commits:** un commit por tarea (T1–T6) en la rama `feat/fase-16-planificacion-diaria`.
