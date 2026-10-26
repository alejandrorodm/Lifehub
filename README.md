# LifeHub

LifeHub es un centro de organización personal, local-first: tareas, calendario, notas y diario, proyectos, hábitos, un inbox de captura rápida y búsqueda global, todo en una sola aplicación que corre en tu propio ordenador. Sin cuentas, sin nube, sin telemetría.

> **Estado actual:** las 8 fases del plan original están completadas, más una fase 9 (integraciones opcionales: notificaciones push y sincronización con Google Calendar), una fase 10 (revisión periódica, resumen de GitHub por proyecto y finanzas con metas) y una fase 11 (noticias de mercados y objetivos de precio) — ver el detalle en [`PLAN.md`](./PLAN.md). La aplicación es funcional de extremo a extremo: tareas, calendario, notas/diario, proyectos, hábitos/rutinas, finanzas, mercados, ajustes y datos (exportar/restaurar/papelera), con una pasada de QA transversal (accesibilidad, teclado) ya hecha.

## Funcionalidades

- **Inbox y captura rápida** (`C`): anota algo en un paso y decide después si es tarea, nota o se descarta.
- **Tareas**: subtareas, checklist, etiquetas, prioridad, fecha/hora límite, recurrencia, papelera con deshacer; vistas Hoy/Próximas/Atrasadas/Completadas/Todas.
- **Calendario**: vistas mes/semana/día, eventos puntuales/de día completo/recurrentes (editar "solo esta ocurrencia" o "toda la serie"), bloques de tiempo, aviso de solapamiento, tareas con fecha visibles en la rejilla, recordatorios.
- **Notas y diario**: editor con formato básico (TipTap), autoguardado, fijar/favorito/archivar, vínculo con tareas y proyectos, entrada de diario por fecha.
- **Proyectos**: hitos, progreso real calculado desde las tareas, pestañas de tareas/notas/calendario/GitHub del proyecto.
- **Hábitos y rutinas**: racha, objetivo y progreso semanal calculados desde el histórico; rutinas con pasos marcables; dashboard "Hoy" configurable (mostrar/ocultar y reordenar widgets).
- **Finanzas** (fase 10): registro manual de aportaciones/retiros por activo (fondo, cripto, acciones, efectivo…) en céntimos enteros — sin precios en vivo, eres tú quien decide cuánto ha entrado o salido; metas de dinero con barra de progreso y asignación opcional de cada aportación a una meta.
- **GitHub por proyecto** (fase 10, opcional): enlaza un repo (`owner/repo`) a cada proyecto desde su pestaña "GitHub" y verás un resumen general (último commit, actividad de los últimos 30 días) — nunca un listado commit a commit. Cada perfil conecta su cuenta de GitHub; el servidor necesita `GITHUB_CLIENT_ID` y `GITHUB_CLIENT_SECRET`.
- **Revisión periódica** (fase 10): `/review` agrega, sin tabla nueva, tareas completadas/creadas, cumplimiento de hábitos, proyectos activos con su progreso e hitos, notas creadas y aportación neta de finanzas — con selector semana/mes.
- **Mercados** (fase 11): `/markets` — resumen de noticias de crypto (CoinDesk, Cointelegraph) y acciones (MarketWatch) por pestañas, y una lista de seguimiento con cotización actual (CoinGecko para cripto, Yahoo Finance para acciones) y objetivo de precio opcional por activo, con el % de distancia al objetivo. Sin API keys; ver "Limitaciones conocidas".
- **Búsqueda global** (`Ctrl/⌘ K`): encuentra tareas, notas, proyectos y eventos desde cualquier pantalla.
- **Ajustes y datos**: tema, zona horaria, inicio de semana, exportar/importar JSON con vista previa y validación, copias de seguridad automáticas, papelera, borrado total con confirmación tecleada.
- **Integraciones** (opcionales, opt-in): notificaciones push (recordatorios aunque la pestaña esté cerrada, fase 9), sincronización bidireccional con Google Calendar (fase 9) y resumen de actividad de GitHub por proyecto (fase 10). Ver la sección "Integraciones" más abajo para configurarlas.

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
- **Servidor:** Node.js + Hono, SQLite (`better-sqlite3`) con Drizzle ORM y migraciones versionadas, Zod (validación compartida con el cliente). Fase 9: `web-push` (notificaciones) y llamadas REST directas a la API de Google (sin el paquete `googleapis`, para no traer un cliente generado enorme por solo tres endpoints). Fase 10: llamadas REST directas a la API de GitHub (mismo criterio, sin `octokit`). Fase 11: llamadas REST directas a CoinGecko/Yahoo Finance y `fast-xml-parser` para los feeds RSS de noticias (sin API keys).
- **Calidad:** TypeScript estricto, ESLint, Prettier, Vitest + Testing Library, Playwright.

Detalles y justificación de cada elección en [`PLAN.md`](./PLAN.md).

## Requisitos previos

- Node.js 22 o superior (desarrollado y probado con Node 24). `better-sqlite3` exige Node ≥22; en Node 20 el módulo nativo no carga (crash al abrir la base de datos, no un error controlado).
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

Desde la fase 13, LifeHub exige iniciar sesión. Antes de la primera vez, crea los perfiles (contraseñas solo por variable de entorno, nunca en el repo):

```bash
LIFEHUB_SEED_IOANA_PASSWORD=... LIFEHUB_SEED_ALEX_PASSWORD=... npm run db:seed-users
```

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
| `LIFEHUB_PUBLIC_URL`  | (sin configurar)         | Origen público cuando hay un reverse proxy delante (ver `deploy/README.md`) |

Ninguna de estas variables es un secreto; no hay claves ni credenciales que configurar en esta fase.

## Integraciones (opcionales)

Ninguna de las dos se activa sola: sin estas variables en `.env`, LifeHub funciona exactamente igual, solo que sin ellas. Los tokens y claves viven solo en `.env`/tu base de datos local — nunca en el repo ni en el export JSON (ver "Checklist de accesibilidad y QA").

### Notificaciones push

Para que un recordatorio llegue aunque tengas la pestaña cerrada:

1. Genera un par de claves VAPID (una sola vez, se reutilizan siempre):
   ```bash
   npx web-push generate-vapid-keys
   ```
2. Añade a tu `.env`:
   ```
   VAPID_PUBLIC_KEY=<la clave pública que te ha dado el comando>
   VAPID_PRIVATE_KEY=<la clave privada>
   VAPID_SUBJECT=mailto:tu-email@ejemplo.com
   ```
3. Reinicia el servidor y activa el interruptor en **Ajustes → Integraciones → Notificaciones push**.

### Google Calendar

Sincroniza tus eventos con Google Calendar en ambos sentidos (crear/editar/borrar en cualquiera de los dos lados se refleja en el otro, con sondeo cada 5 minutos — sin webhooks, porque exigirían una URL pública y el servidor solo escucha en `127.0.0.1`).

1. Crea un proyecto en [Google Cloud Console](https://console.cloud.google.com/) (o reutiliza uno).
2. Activa la **Google Calendar API** (menú "APIs y servicios" → "Biblioteca").
3. Crea credenciales OAuth ("APIs y servicios" → "Credenciales" → "Crear credenciales" → "ID de cliente de OAuth", tipo "Aplicación web").
4. En "URIs de redireccionamiento autorizados" añade exactamente:
   ```
   http://127.0.0.1:3131/api/integrations/google/callback
   ```
   (cambia el puerto si usas `LIFEHUB_PORT` distinto de 3131).
5. Copia el *Client ID* y el *Client Secret* a tu `.env`:
   ```
   GOOGLE_CLIENT_ID=<tu client id>
   GOOGLE_CLIENT_SECRET=<tu client secret>
   GOOGLE_REDIRECT_URI=http://127.0.0.1:3131/api/integrations/google/callback
   ```
6. Reinicia el servidor y pulsa "Conectar" en **Ajustes → Integraciones → Google Calendar**. Mientras el proyecto de Google Cloud esté en modo de prueba, tendrás que añadir tu propio correo como "usuario de prueba" en la pantalla de consentimiento OAuth.

En producción detrás de un dominio/reverse proxy, usa `https://tu-dominio.com/...` en vez de `http://127.0.0.1:3131/...` en los pasos 4 y 5, y añade `LIFEHUB_PUBLIC_URL` — ver [`deploy/README.md`](deploy/README.md).

**Limitación conocida:** si editas o cancelas una sola ocurrencia (no toda la serie) de un evento recurrente desde Google Calendar, ese cambio todavía no se sincroniza a LifeHub — Google lo representa de una forma distinta a las excepciones de esta app. Editar la serie completa sí se sincroniza en ambos sentidos.

### GitHub (fase 10)

Resumen de solo lectura de la actividad de un repo por proyecto — no hay flujo de conexión ni OAuth, es una variable de entorno del servidor:

1. Crea un [token de acceso personal](https://github.com/settings/tokens) en GitHub (basta con permiso de lectura sobre repos; `public_repo` si el repo es público, o acceso al repo concreto si es privado).
2. Añade a tu `.env`:
   ```
   GITHUB_CLIENT_ID=<id de la OAuth App>
   GITHUB_CLIENT_SECRET=<secreto de la OAuth App>
   ```
3. Reinicia el servidor. En **Ajustes → Integraciones** verás el badge "GitHub: configurado". Enlaza un repo (`owner/repo`) desde la pestaña "GitHub" de cada proyecto.

**Limitación conocida:** `commitsLast30Days` es una cuenta aproximada (una sola llamada `GET /commits?per_page=100`); un repo con más de 100 commits en 30 días mostrará 100 como tope.

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

## Despliegue en un VPS

Para desplegar en un servidor propio (systemd, sin Docker) en vez de correrlo en local, ver [`deploy/README.md`](deploy/README.md).

## Checklist de accesibilidad y QA (fase 8)

- **Sin violaciones críticas de axe**: `tests/e2e/a11y.spec.ts` comprueba las 10 pantallas principales y la paleta de comandos con [`@axe-core/playwright`](https://github.com/dequelabs/axe-core-npm).
- **Recorrido completo solo con teclado**: `tests/e2e/shell.spec.ts` incluye un flujo real (navegar con `G T`, crear una tarea con `N` + Enter, abrir su detalle, leer el título y cerrar con `Esc`) sin usar el ratón.
- **Botones y enlaces sin función**: auditoría manual de todo `src/client` — no se encontró ningún botón/enlace muerto. Única limitación conocida: en el calendario (vista semana/día), el doble clic para crear un evento en la rejilla es solo de ratón; el botón "Nuevo evento" de la cabecera es la vía equivalente por teclado.
- **Viewports**: la suite E2E corre en Chromium a 1440px (Desktop), 768px (Tablet) y 390px (Mobile). Los flujos de datos (crear/editar/borrar) se verifican una sola vez en Desktop por diseño; el layout responsive (`shell.spec.ts`) se verifica en los 3.

## Limitaciones conocidas

- **Un solo equipo:** no hay sincronización entre dispositivos; es una aplicación local-first por diseño.
- **Recordatorios:** con las notificaciones push activadas (ver "Integraciones") llegan aunque la pestaña esté cerrada; sin activarlas, solo se disparan con la aplicación abierta en el navegador.
- **Seguridad:** el servidor escucha únicamente en `127.0.0.1` y no tiene autenticación; la protección de tus datos depende del acceso a tu propio equipo.
- **Asistente de IA local (Ollama/Qwen):** solo está planificado arquitectónicamente por ahora (ver sección 7 de `PLAN.md`); no hay ninguna funcionalidad de IA todavía.
- **Mercados (fase 11):** las cotizaciones y noticias dependen de endpoints públicos sin API key, con sus propios límites — CoinGecko tiene un límite de peticiones gratuito (mitigado con caché de 2 min) y un símbolo cripto puede coincidir con varias monedas (se usa la de mayor capitalización); el endpoint de Yahoo Finance usado para acciones no es una API oficialmente soportada y podría cambiar sin aviso. Si un endpoint o feed falla, se muestra el motivo en vez de romper la pantalla.
