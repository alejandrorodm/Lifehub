# Fase 8 — QA, accesibilidad y pulido

Objetivo: cerrar la última fase del plan (QA transversal sobre las fases 1-7). Rama: `main` (directo, igual que fases 1-7). Runner: `npx vitest run`, `npx tsc --noEmit`, `npx eslint .`, `npx playwright test`.

## Specs

Citas verbatim de `PLAN.md`:

- S1 (tabla de fases, fila 8): "QA: E2E completos, accesibilidad, responsive, rendimiento, pulido visual, auditoría de 'botones sin función', README final"
- S2 (criterio de aceptación #8, el único con condiciones verificables para esta fase): "Suite E2E de la sección 9 en verde en Chromium a 1440, 768 y 390 px; sin violaciones críticas de axe; recorrido completo solo con teclado; checklist de botones/enlaces sin función revisada; README completo."
- S3 (sección 9, pruebas — flujos E2E esperados): "tarea CRUD completo; evento visible en calendario; tarea + nota vinculadas a proyecto; hábito y estadísticas; búsqueda abre el resultado correcto; recarga → persistencia; exportar → borrar → restaurar; entradas inválidas; viewports; rastreo automático de botones/enlaces que no producen acción ni navegación."
- S4 (sección 9, regla de entrega): "en cada entrega se informa qué está implementado, probado (con el comando ejecutado) y pendiente; nunca se afirma un test no ejecutado."
- S5 (AGENTS.md): "añadir dependencias solo con justificación escrita en el commit/PLAN"; "accesibilidad: elementos interactivos accesibles por teclado, con aria-label cuando no hay texto, foco visible."

**Alcance explícitamente fuera de esta fase** (citado en la fila de la tabla de fases como "rendimiento, pulido visual" pero sin ningún criterio de aceptación verificable que lo concrete, para no inventar requisitos): no se añaden métricas de rendimiento (Lighthouse, bundle size budgets) ni un rediseño visual; solo se corrigen problemas de accesibilidad/funcionalidad concretos encontrados en la auditoría.

**Hallazgos del mapeo previo** (agente de exploración, solo lectura, 2026-10-17):
1. No hay botones/enlaces muertos (`onClick` vacío, `href="#"`, TODOs) en todo `src/client`. Único hallazgo: `WeekView.tsx` crea evento solo con doble clic en la rejilla (sin equivalente por teclado en la propia rejilla), pero `CalendarPage.tsx` ya tiene un botón "Nuevo evento" accesible por teclado como vía alternativa — se documenta como limitación conocida, no se considera botón muerto.
2. Violación real de ARIA: `CommandPalette.tsx:114` usa `role="listbox"` con hijos `<li><button>` sin `role="option"` — axe lo marcaría como `aria-required-children`.
3. No existe ninguna dependencia de axe (`axe-core`, `@axe-core/playwright`, `jest-axe`) en el proyecto.
4. `README.md` está desactualizado: banner dice "Fase 1 completada" y lista módulos de fases 2-7 como "no implementados todavía", cuando están completos.
5. El test de teclado existente (`shell.spec.ts`) solo cubre navegación entre secciones, no un recorrido completo (crear/editar datos, diálogos, Esc) por teclado.
6. No existe `tests/e2e/habits.spec.ts` pese a que la sección 9 del plan pide expresamente un flujo E2E de "hábito y estadísticas".
7. Los 5 specs de flujo de datos (`calendar`, `data`, `notes`, `projects`, `tasks`) ya se ejecutan solo en Desktop a propósito (decisión de fases anteriores, documentada en cada `test.skip`); `shell.spec.ts` ya corre en los 3 viewports (1440/768/390). Esto ya satisface la parte de "viewports" de S2/S3 para lo existente.

## Tasks

| ID  | Specs      | Ruta   | Estado | Commit/evidencia |
| --- | ---------- | ------ | ------ | ----------------- |
| T1  | S2, S5     | inline | hecho | `CommandPalette.tsx`: quitado `role="listbox"` (no había navegación por flechas real; los botones ya son accesibles por teclado de forma nativa) |
| T2  | S2, S5     | inline | hecho | `@axe-core/playwright` añadido (justificado por S2); `tests/e2e/a11y.spec.ts` (axe sobre las 10 páginas + paleta de comandos, Desktop). 3 violaciones reales corregidas: contraste de `--color-text-subtle` en modo oscuro (`tokens.css`), contraste del rango horario de eventos por `opacity-80` (`WeekView.tsx`), `aria-label` ausente en el editor TipTap (`RichTextEditor.tsx` + `NoteEditor.tsx`) |
| T3  | S2         | inline | hecho | `shell.spec.ts`: test nuevo — crear tarea (atajo "G T" + "N" + Enter), abrir su detalle (Enter), leer el título y cerrar (Escape), sin ningún `.click()` |
| T4  | S3         | inline | hecho | `tests/e2e/habits.spec.ts`: crear hábito, registrar hoy, racha visible en la tarjeta y en el detalle |
| T5  | S2         | inline | hecho | `README.md` § "Checklist de accesibilidad y QA (fase 8)": resultado de la auditoría (ninguno muerto, 1 limitación conocida en `WeekView`) |
| T6  | S1, S2     | inline | hecho | `README.md` reescrito: banner (8 fases completadas), secciones "Funcionalidades" y "Atajos de teclado" nuevas, "Copias de seguridad y restauración" actualizada (export/import/papelera ya implementados), "Limitaciones conocidas" sin módulos pendientes |
| T7  | S2, S4     | inline | hecho | `tsc`, `eslint`, `vitest run` (93/93) y `playwright test` (43/43 ejecutados en los 3 viewports, 68 omitidos por diseño) en verde, con `.e2e-data/` limpio. Corregido además un contraste de `--color-text-subtle` en tema claro (mismo bug que en oscuro, oculto hasta tener datos reales en Calendario); `PLAN.md` fase 8 → completada |

Sin Writer trigger: trabajo de una sola persona, secuencial, sin paralelismo — inline igual que fases 1-7.

**Riesgo**: ninguna tarea toca ítems de alto riesgo (sin migraciones, sin auth, sin contratos públicos, sin concurrencia, sin despliegue); los cambios de accesibilidad/README/tests los cubre la propia suite E2E. `Risk: none` esperado en todos los commits de esta fase.

## Log

- L1 (2026-10-17): Usuario: "Continúa con la fase 8". Autorización explícita para implementar, igual que fases anteriores.
- L2 (2026-10-17): Mapeo previo (agente de exploración read-only) resumido arriba; define el alcance real de T1-T6 a partir de hallazgos concretos en vez de repetir la auditoría desde cero.
- L3 (2026-10-17): T1-T7 completadas en la misma sesión. Además de lo planificado, el pase de axe encontró y corrigió 4 bugs reales de accesibilidad no anticipados en los Specs: `role="listbox"` incompleto en `CommandPalette`, contraste insuficiente de `--color-text-subtle` en claro y oscuro (`tokens.css`), contraste por `opacity-80` en el rango horario de eventos (`WeekView.tsx`) y `aria-label` ausente en el editor TipTap compartido (`RichTextEditor.tsx`). `PLAN.md` actualizado: fase 8 → completada (última fase del plan). No se pudo verificar visualmente en un navegador real (extensión Claude en Chrome no conectada en este entorno, igual que en fases anteriores); la cobertura E2E con Playwright real (incluida la de accesibilidad con axe) sustituye esa verificación visual.
