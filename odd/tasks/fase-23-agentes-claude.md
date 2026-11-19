# Fase 23 — Implementar listas de tareas con sesiones de Claude, de principio a fin

Objetivo: enlazar listas de LifeHub con repos de GitHub y que un botón lance, tarea a tarea, una sesión de Claude Code en el PC del usuario: PR, fusión y despliegue.
Rama: `feat/claude-agent-jobs` (desde `feat/warm-redesign`, lo que está en producción). Entrega: `ask-on-risk`, commits por unidad de trabajo. Tests: `vitest` (`npm test`), `playwright` (`npm run test:e2e`).

## Specs

- S1. "Relacionar listas Lifehub con proyectos de GitHub": cada lista de tareas de LifeHub (las de Google Tasks) puede enlazarse con un repo de GitHub (`owner/repo`). El comando de despliegue vive en el PC (ver L6).
- S2. "poder hacer una sesión de Claude en la que se implementen de principio a fin cada una de las implementaciónes (tareas del Google tasks)": un botón "Implementar con Claude" en la lista pone en cola un trabajo por cada tarea pendiente. Las tareas se ejecutan en orden, una detrás de otra.
- S3. "con PR por implementación y despliegue completo dándole a un botón" — decisión del usuario, "Todo automático": por cada tarea, PR; fusión si typecheck, lint y tests pasan; luego la siguiente. Al terminar todas, despliegue. Se detiene en la primera tarea que falle y deja su PR abierta.
- S4. "tener id de la sesión y poder conectarme con ClaudeSSH a dicha sesión" — decisión del usuario: las sesiones corren "en este pc al que me conecto a través de ssh desde mis dispositivos". Cada trabajo muestra su id de sesión y el comando para conectarse (`claude attach <id>`, sesiones `claude --bg --session-id <uuid>`).
- S5. Seguridad (necesaria por S3): el VPS nunca llama al PC. Un servicio en el PC consulta el VPS con un token propio, revocable y guardado solo como hash. Solo puede reclamar y actualizar trabajos de su usuario.

## Tasks

| ID | Specs | Ruta | Estado | Commit |
| -- | ----- | ---- | ------ | ------ |
| T1 | S1 | inline | ✅ tabla `agent_list_links`, `PUT/DELETE /api/agents/links/:listId` | 85d2b64 |
| T2 | S2, S5 | inline | ✅ ejecuciones y trabajos, `/runner` con token `lhr_` (hash SHA-256), dominio `nextRunStep`/`canReportJob`; 23 tests (8 dominio RED→GREEN, 15 API escritos tras el código y validados con 2 mutaciones) | 85d2b64, 9f614b6 |
| T3 | S3, S4 | inline | ✅ `src/runner` (`npm run runner`, `setup`), worktree fijo por repo, re-comprueba y fusiona con `--match-head-commit`, servicio systemd de usuario, `deploy/agent-runner.md`; 29 tests (RED→GREEN) + e2e local con claude/gh falsos | (ejecutor) |
| T4 | S2, S4 | inline | pendiente | |
| T5 | — | inline | pendiente (cierre: docs, checks, push y despliegue si el usuario lo pide) | |

T1: enlace lista ↔ repo. T2: cola de trabajos y API del ejecutor con token. T3: ejecutor en el PC. T4: interfaz (botón, estado, id de sesión, PR).

## Log

- L1 (2026-11-19, usuario): "Relacionar listas Lifehub con proyectos de GitHub y poder hacer una sesión de Claude en la que se implementen de principio a fin cada una de las implementaciónes (tareas del Google tasks) con PR por implementación y despliegue completo dándole a un botón, tener id de la sesión y poder conectarme con ClaudeSSH a dicha sesión"
- L2 (2026-11-19, usuario): dónde corren las sesiones: "en este pc al que me conecto a través de ssh desde mis dispositivos".
- L3 (2026-11-19, usuario): autonomía: "Todo automático (Recomendado)".
- L4 (2026-11-19): evidencia — VPS con 1 CPU y ~94 MB de RAM libres (no puede ejecutar agentes); el PC tiene 10 núcleos y ~12 GB libres, Claude Code 2.1.328 con `--bg`, `--session-id` y `claude attach`, y `gh` autenticado. No hay tmux. "ClaudeSSH" no existe como producto; se interpreta como conectarse por SSH al PC y adjuntarse a la sesión.
- L5 (2026-11-19): la fase 22 queda en pausa (T1 en el commit local 66fcec5, sin consentimiento de revisión respondido).
- L6 (2026-11-19): decisión de seguridad — el comando de despliegue y la ruta local de cada repo viven en la configuración del ejecutor en el PC, no en LifeHub: si alguien entrase en el VPS no podría decidir qué comando se ejecuta en el PC. El ejecutor solo acepta repos que tenga en su configuración. Las tablas de agentes no van en la exportación JSON (estado operativo; el token es un secreto).
- L7 (2026-11-19): T1+T2 verificados — typecheck y lint limpios, vitest 424/424. Comprobación por mutación: quitar el filtro de token revocado o el de perfil en `claimNext` hace fallar los tests (el segundo obligó a reforzar el test de aislamiento).
- L8 (2026-11-19): revisión nativa de 85d2b64 (riesgo y fiabilidad) aprobada y confirmada; sus 6 avisos no bloqueantes se arreglaron en 9f614b6 (`POST /runner/reset` para trabajos colgados, desplegar si el resto se saltó, informe de fusión atómico, URL de PR solo de github.com, repos sin `.`/`..`, test de aislamiento al informar).
- L9 (2026-11-19): hallazgo — Claude Code no arranca sesiones `--bg` en carpetas sin confianza aceptada, y la confianza no se hereda de la carpeta padre (probado con una sesión real). Solución: un worktree fijo por repo, en el que el usuario confía una vez; el ejecutor lo comprueba al arrancar leyendo `~/.claude.json` (sin modificarlo).
- L10 (2026-11-19): e2e local del ejecutor contra un LifeHub real con `claude` y `gh` falsos y un remoto git desnudo: 2 tareas en orden, ambas fusionadas con el commit comprobado, tareas completadas, despliegue del `main` final, ramas remotas borradas, sesiones paradas.
