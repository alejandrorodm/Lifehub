# LifeHub

LifeHub es un centro de organización personal, local-first: tareas, calendario, notas y diario, proyectos, hábitos, un inbox de captura rápida y búsqueda global, todo en una sola aplicación que corre en tu propio ordenador. Sin cuentas, sin nube, sin telemetría.

> **Estado actual:** Fase 1 (Fundamentos) completada. El shell, la base de datos, el tema y la arquitectura están listos; los módulos de contenido (tareas, calendario, notas, proyectos, hábitos) se irán añadiendo fase a fase según [`PLAN.md`](./PLAN.md). Las secciones todavía no implementadas muestran un aviso claro en lugar de datos simulados.

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

La exportación a JSON, la copia manual bajo demanda y la restauración desde un archivo (con validación y confirmación) se implementarán en la fase 7 del plan — por ahora, la recuperación manual consiste en copiar el archivo `.db` deseado desde `backups/` sobre `lifehub.db` con el servidor detenido.

## Limitaciones conocidas

- **Un solo equipo:** no hay sincronización entre dispositivos; es una aplicación local-first por diseño.
- **Recordatorios:** solo se disparan mientras la aplicación está abierta en el navegador (no hay notificaciones del sistema operativo en esta fase).
- **Seguridad:** el servidor escucha únicamente en `127.0.0.1` y no tiene autenticación; la protección de tus datos depende del acceso a tu propio equipo.
- **Módulos pendientes:** tareas, calendario, notas/diario, proyectos y hábitos aún no están implementados (ver el estado de fases en [`PLAN.md`](./PLAN.md)); sus pantallas indican explícitamente en qué fase se construirán.
- **Asistente de IA local (Ollama/Qwen):** solo está planificado arquitectónicamente por ahora (ver sección 7 de `PLAN.md`); no hay ninguna funcionalidad de IA todavía.
