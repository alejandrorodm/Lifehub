# LifeHub

LifeHub es un centro de organización personal, local-first: tareas, calendario, notas y diario, proyectos, hábitos, un inbox de captura rápida y búsqueda global, todo en una sola aplicación que corre en tu propio ordenador. Sin cuentas, sin nube, sin telemetría.

> **Estado actual:** las 8 fases del plan están completadas (ver el detalle en [`PLAN.md`](./PLAN.md)). La aplicación es funcional de extremo a extremo: tareas, calendario, notas/diario, proyectos, hábitos/rutinas, ajustes y datos (exportar/restaurar/papelera), y una pasada de QA transversal (accesibilidad, teclado, README).

## Funcionalidades

- **Inbox y captura rápida** (`C`): anota algo en un paso y decide después si es tarea, nota o se descarta.
- **Tareas**: subtareas, checklist, etiquetas, prioridad, fecha/hora límite, recurrencia, papelera con deshacer; vistas Hoy/Próximas/Atrasadas/Completadas/Todas.
- **Calendario**: vistas mes/semana/día, eventos puntuales/de día completo/recurrentes (editar "solo esta ocurrencia" o "toda la serie"), bloques de tiempo, aviso de solapamiento, tareas con fecha visibles en la rejilla, recordatorios.
- **Notas y diario**: editor con formato básico (TipTap), autoguardado, fijar/favorito/archivar, vínculo con tareas y proyectos, entrada de diario por fecha.
- **Proyectos**: hitos, progreso real calculado desde las tareas, pestañas de tareas/notas/calendario del proyecto.
- **Hábitos y rutinas**: racha, objetivo y progreso semanal calculados desde el histórico; rutinas con pasos marcables; dashboard "Hoy" configurable (mostrar/ocultar y reordenar widgets).
- **Búsqueda global** (`Ctrl/⌘ K`): encuentra tareas, notas, proyectos y eventos desde cualquier pantalla.
- **Ajustes y datos**: tema, zona horaria, inicio de semana, exportar/importar JSON con vista previa y validación, copias de seguridad automáticas, papelera, borrado total con confirmación tecleada.

## Atajos de teclado

Toda la aplicación se puede usar sin ratón. Pulsa `?` en cualquier pantalla para ver esta ayuda dentro de la app.

| Atajo                    | Acción                                              |
| ------------------------- | ---------------------------------------------------- |
| `Ctrl`/`⌘` + `K`          | Abrir la paleta de comandos (navegar o buscar)       |
| `C` o `Q`                 | Captura rápida al inbox                              |
| `G` luego `H/I/T/C/N/P`   | Ir a Hoy / Inbox / Tareas / Calendario / Notas / Proyectos |
| `N`                       | Nuevo elemento en la vista actual (tarea, nota, hábito…) |
| `J` / `K`                 | Mover la selección en una lista                      |
| `X`                       | Completar la tarea seleccionada                      |
| `Esc`                     | Cerrar el diálogo o panel abierto                    |
| `?`                       | Mostrar la ayuda de atajos                           |

## Tecnologías

- **Cliente:** React 19, Vite, React Router, TanStack Query, Tailwind CSS v4, Radix UI, TipTap (editor), lucide-react.
- **Servidor:** Node.js + Hono, SQLite (`better-sqlite3`) con Drizzle ORM y migraciones versionadas, Zod (validación compartida con el cliente).
- **Calidad:** TypeScript estricto, ESLint, Prettier, Vitest + Testing Library, Playwright.

Detalles y justificación de cada elección en [`PLAN.md`](./PLAN.md).

## Requisitos previos

- Node.js 20 o superior (desarrollado y probado con Node 24).
- npm (incluido con Node).
- En Linux, `better-sqlite3` instala un binario precompilado; si tu plataforma no tiene uno disponible, necesitarás herramientas de compilación nativas (`build-essential`, `python3`).

## Instalación

```bash
git clone <url-del-repositorio> lifehub
cd lifehub
npm install
```

## Ejecución

```bash
npm run dev
```

Esto arranca a la vez el servidor (API + base de datos, por defecto en `http://127.0.0.1:3131`) y el cliente de Vite (por defecto en `http://127.0.0.1:5173`, con proxy automático de `/api` hacia el servidor). Abre `http://127.0.0.1:5173` en tu navegador.

Para ejecutar una build de producción (un solo proceso sirve la API y los archivos estáticos):

```bash
npm run build
npm start
```

## Configuración

LifeHub no necesita configuración para funcionar. Si quieres cambiar algo, copia `.env.example` a `.env` y ajusta lo que necesites:

| Variable              | Por defecto              | Descripción                                            |
| --------------------- | ------------------------ | ------------------------------------------------------ |
| `LIFEHUB_HOST`        | `127.0.0.1`              | Host del servidor (API + estáticos en producción)      |
| `LIFEHUB_PORT`        | `3131`                   | Puerto del servidor                                    |
| `LIFEHUB_CLIENT_PORT` | `5173`                   | Puerto del servidor de desarrollo de Vite              |
| `LIFEHUB_DATA_DIR`    | `~/.local/share/lifehub` | Dónde viven la base de datos y las copias de seguridad |

Ninguna de estas variables es un secreto; no hay claves ni credenciales que configurar en esta fase.

## Pruebas

```bash
npm run typecheck   # TypeScript, cero errores
npm run lint        # ESLint
npm test            # Vitest: pruebas unitarias e de integración (BD SQLite real)
npm run test:e2e    # Playwright: flujos completos en Desktop/Tablet/Mobile
```

`test:e2e` instala y lanza Chromium automáticamente la primera vez (`npx playwright install chromium` si hiciera falta) y usa un directorio de datos aislado (`.e2e-data/`, no se comitea).

## Dónde viven tus datos

Todo se guarda en un único archivo SQLite fuera del repositorio, para que nunca se pierda ni se suba a ningún sitio por error:

```
~/.local/share/lifehub/
├── lifehub.db        # tus datos
└── backups/          # copias de seguridad automáticas (rotación de 14)
```

Puedes cambiar esta ubicación con `LIFEHUB_DATA_DIR`.

## Copias de seguridad y restauración

LifeHub crea una copia de seguridad automática cada vez que arranca el servidor, usando la API de backup en caliente de SQLite (no bloquea ni corrompe datos). Las copias se pueden consultar desde **Ajustes → Datos**.

Desde **Ajustes → Datos** puedes exportar todo a un archivo JSON (incluye `schemaVersion` para comprobar compatibilidad), importarlo con una vista previa de conteos antes de confirmar, o borrar todos los datos (requiere teclear "BORRAR TODO"). Antes de importar o borrar, LifeHub crea automáticamente una copia de seguridad; un archivo inválido o corrupto se rechaza con un mensaje claro sin tocar la base de datos. Los elementos eliminados (tareas, notas, proyectos, eventos) van a la **Papelera** (`/trash`), desde donde se pueden restaurar.

## Checklist de accesibilidad y QA (fase 8)

- **Sin violaciones críticas de axe**: `tests/e2e/a11y.spec.ts` comprueba las 10 pantallas principales y la paleta de comandos con [`@axe-core/playwright`](https://github.com/dequelabs/axe-core-npm).
- **Recorrido completo solo con teclado**: `tests/e2e/shell.spec.ts` incluye un flujo real (navegar con `G T`, crear una tarea con `N` + Enter, abrir su detalle, leer el título y cerrar con `Esc`) sin usar el ratón.
- **Botones y enlaces sin función**: auditoría manual de todo `src/client` — no se encontró ningún botón/enlace muerto. Única limitación conocida: en el calendario (vista semana/día), el doble clic para crear un evento en la rejilla es solo de ratón; el botón "Nuevo evento" de la cabecera es la vía equivalente por teclado.
- **Viewports**: la suite E2E corre en Chromium a 1440px (Desktop), 768px (Tablet) y 390px (Mobile). Los flujos de datos (crear/editar/borrar) se verifican una sola vez en Desktop por diseño; el layout responsive (`shell.spec.ts`) se verifica en los 3.

## Limitaciones conocidas

- **Un solo equipo:** no hay sincronización entre dispositivos; es una aplicación local-first por diseño.
- **Recordatorios:** solo se disparan mientras la aplicación está abierta en el navegador (no hay notificaciones del sistema operativo).
- **Seguridad:** el servidor escucha únicamente en `127.0.0.1` y no tiene autenticación; la protección de tus datos depende del acceso a tu propio equipo.
- **Asistente de IA local (Ollama/Qwen):** solo está planificado arquitectónicamente por ahora (ver sección 7 de `PLAN.md`); no hay ninguna funcionalidad de IA todavía.
