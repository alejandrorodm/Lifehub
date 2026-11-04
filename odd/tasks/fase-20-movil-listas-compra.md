# Fase 20 — UI móvil "neutro sobrio" y listas de la compra

Objetivo: que la app sea cómoda en el móvil con un aspecto minimalista y profesional, y añadir listas de la compra con nombre.
Rama: `feat/mobile-redesign-shopping` (desde `feat/ui-improvements`). Entrega: `ask-on-risk`, commits por unidad de trabajo. Tests: `vitest` (`npm test`), `playwright` (`npm run test:e2e`).

## Specs

- S1. "instala hooks y skills para mejorar la interfaz" — skills de proyecto para UI (`frontend-design` oficial de Anthropic + `lifehub-ui` con las reglas de esta app) y un hook de Claude Code que lintea cada archivo editado.
- S2. "darle un toque nuevo minimalista y profesional" — dirección elegida por el usuario: "Neutro sobrio" (todo en Inter, grises fríos casi monocromos, acento índigo más contenido, más aire, tarjetas sin bordes marcados).
- S3. "la aplicación no me parece cómoda de usar con el móvil ... trabaja mucho en como la UI sea friendly para el usuario y versátil" — objetivos táctiles ≥ 44 px, campos a 16 px en móvil, zonas seguras, acciones principales al alcance del pulgar, sin acciones solo con hover, sin scroll horizontal a 360 px.
- S4. "añade listas de cosas para comprar (listas con nombres cada una para organizar)" — varias listas con nombre; cada una con artículos que se añaden, marcan como comprados, editan y borran; crear, renombrar y borrar listas.

## Tasks

| ID | Specs | Ruta | Estado | Commit |
| -- | ----- | ---- | ------ | ------ |
| T1 | S1 | inline | ✅ | (ver log) |
| T2 | S4 | inline | ⏳ backend: tablas, migración, servicio con tests, rutas, export/import | |
| T3 | S4, S3 | inline | ⏳ frontend: página `/shopping`, navegación, estados de carga/vacío/error | |
| T4 | S2, S3 | inline | ⏳ sistema visual: tokens, tipografía, primitivas táctiles | |
| T5 | S3 | inline | ⏳ shell móvil: barra superior, barra inferior con zona segura | |
| T6 | S3 | inline | ⏳ revisión de pantallas con capturas Mobile/Desktop y arreglos | |
| T7 | todas | inline | ⏳ cierre: typecheck, lint, test, e2e, PLAN.md | |

Rutas: todo inline (sin unidades paralelas independientes con razón para delegar).

## Log

- L1 (2026-11-04, usuario): "asme pasa que la aplicación no me parece cómoda de usar con el móvil, instala hooks y skills para mejorar la interfaz darle un toque nuevo minimalista y profesional y trabaja mucho en como la UI sea friendly para el usuario y versátil. además añade listas de cosas para comprar (listas con nombres cada una para organizar)"
- L2 (2026-11-04, usuario): elige la dirección visual "Neutro sobrio".
- L3: T1 — `.claude/skills/frontend-design` (Apache 2.0, de github.com/anthropics/skills), `.claude/skills/lifehub-ui`, hook `PostToolUse` en `.claude/settings.json` → `.claude/hooks/lint.sh` (ESLint --fix sobre el archivo editado; devuelve los problemas a Claude). Prettier descartado en el hook: gran parte del código no está formateado con Prettier y reformatear archivos enteros inflaría los diffs. Probado: archivo limpio → exit 0; archivo con variable sin usar → exit 2 con el aviso.
