# LifeHub — Plan de desarrollo

> Estado: **Fase 0 (planificación) completada.** Implementación pendiente de aprobación explícita.

## Estado de las fases

| # | Fase | Estado |
|---|---|---|
| 1 | Fundamentos | Pendiente |
| 2 | Tareas, Inbox, captura rápida, Dashboard v1 | Pendiente |
| 3 | Proyectos e hitos | Pendiente |
| 4 | Calendario y recordatorios | Pendiente |
| 5 | Notas, diario y búsqueda global | Pendiente |
| 6 | Hábitos y rutinas; dashboard configurable | Pendiente |
| 7 | Ajustes, exportación, copias y restauración | Pendiente |
| 8 | QA, accesibilidad y pulido | Pendiente |

## Situación inicial

Directorio vacío (sin archivos ni git) a 2026-10-15. Entorno: Linux, Node v24.15.0, npm 11.12.1; `ollama` no está en el PATH (se verificará en la fase de IA; no bloquea el núcleo).

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

| Capa | Elección | Por qué |
|---|---|---|
| Lenguaje | TypeScript (strict) | Tipado compartido cliente/servidor. |
| Frontend | React 19 + Vite | Ecosistema maduro, HMR rápido, SPA suficiente (sin SEO ni SSR). |
| Routing | React Router (modo SPA) | Rutas anidadas, URL como estado (filtros, fecha visible). |
| Estado servidor | TanStack Query | Caché, invalidación entre módulos (completar tarea → dashboard/proyecto se actualizan), optimistic updates. |
| Estilos | Tailwind CSS v4 + tokens CSS propios | Sistema de diseño con variables (claro/oscuro) sin CSS disperso. |
| Primitivas UI | Radix UI (dialog, popover, dropdown, tooltip…) + componentes propios | Accesibilidad resuelta sin imponer estética. |
| Iconos | lucide-react | Consistentes, tree-shakeable, sin emojis. |
| Editor | TipTap (ProseMirror) con contenido guardado en **Markdown** | Formato portable, exportable y legible por un LLM. |
| Fechas | date-fns + @date-fns/tz | Funcional, inmutable, soporte IANA. |
| Recurrencia | `rrule` (RFC 5545) | Estándar probado; evita implementar recurrencias a mano. |
| Servidor | Hono sobre `@hono/node-server` | Ligero, tipado, validador Zod integrado, cliente RPC tipado. |
| BD | SQLite (`better-sqlite3`) + Drizzle ORM y drizzle-kit | Archivo único, transacciones síncronas, FTS5 para búsqueda, migraciones SQL versionadas. |
| Validación | Zod | Un esquema en `src/shared` usado por formularios y endpoints. |
| Formularios | react-hook-form + resolver Zod | Validación cómoda y errores por campo. |
| Tests | Vitest (unidad + API con BD en memoria), Testing Library, Playwright (E2E y viewports) | Cubren los flujos de la sección 9. |
| Calidad | ESLint + Prettier, `tsc --noEmit` | Comprobación en cada fase. |

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

| # | Fase | Depende de |
|---|---|---|
| 1 | Fundamentos: scaffold, tokens/tema, componentes UI base, shell y navegación responsive, BD+migraciones, manejo de errores, ajustes de tema, snapshot automático de BD, infra de tests, `git init` | — |
| 2 | Tareas + etiquetas + Inbox + captura rápida + Dashboard v1 (tareas) + paleta de comandos (navegación) | 1 |
| 3 | Proyectos e hitos, vinculación tarea↔proyecto, progreso, dashboard: proyectos activos | 2 |
| 4 | Calendario (3 vistas, recurrencia, bloques, conflictos, tareas programadas) + recordatorios + dashboard: agenda | 3 |
| 5 | Notas, diario, autoguardado, vínculos nota↔tarea/proyecto, búsqueda global FTS | 3 |
| 6 | Hábitos, rutinas, estadísticas; dashboard configurable completo | 2 |
| 7 | Ajustes y datos: preferencias, exportar JSON, restaurar con validación, papelera, borrado total | 1–6 |
| 8 | QA: E2E completos, accesibilidad, responsive, rendimiento, pulido visual, auditoría de "botones sin función", README final | 1–7 |

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

| Riesgo | Mitigación |
|---|---|
| `better-sqlite3` es nativo (compilación) | Node 24 tiene binarios precompilados; si falla, documentar `build-essential`/`python3`. Alternativa: `node:sqlite`. |
| Recurrencias + zonas horarias + DST | `rrule` + `@date-fns/tz`, expansión en servidor, tests específicos de DST. |
| Editor rico ↔ Markdown con pérdidas | Limitar a formato básico (títulos, listas, checklist, negrita/cursiva, enlaces, código, citas) con tests de ida y vuelta. |
| Calendario hecho a mano es costoso | Vistas propias (sin librería pesada) acotadas a mes/semana/día; arrastrar para crear/mover en semana/día; redimensionar como mejora posterior si se complica. |
| Recordatorios sin la app abierta | Limitación declarada; posible ampliación con PWA/servicio de sistema. |
| Alcance amplio | Fases cortas, cada una usable; nada de funciones "a medias" visibles en la UI. |
| Pérdida de datos | Papelera, deshacer, snapshots, autoguardado, confirmaciones, migraciones con snapshot previo. |
| Exposición en red | Servidor ligado a 127.0.0.1; sin CORS abierto. |
