# Fase 18 — Finanzas completas: gastos, presupuestos, metas con asignación y gráficas

Objetivo: ampliar `/finance` (fase 10: activos, metas, aportaciones) con gastos/ingresos categorizados, presupuestos mensuales, asignación y retirada de dinero en metas y un resumen con gráficas.
Rama: `feat/finance-budgets` (desde `feat/github-oauth`). Entrega: `ask-on-risk`. Runner: `vitest` (+ `playwright` al cerrar).

## Specs

- S1 (L1, verbatim): "Propon 10 mejoras" — propuesta en la respuesta, sin implementar.
- S2 (L1, verbatim): "añade una interfaz completa para llevar gastos" — movimientos de gasto/ingreso con importe, fecha, descripción, categoría y cuenta opcional; alta, edición, borrado con confirmación; filtro por mes, tipo, categoría y texto; exportación CSV del mes.
- S3: categorías de gasto/ingreso con color y presupuesto mensual opcional; papelera; botón para crear categorías sugeridas (sin escrituras ocultas en GET).
- S4 (L1, verbatim): "metas, poder poner dinero asignado a metas" — desde cada meta: asignar dinero (aportación a una cuenta asignada a la meta) y retirar; historial de la meta; cuánto falta y cuánto hay que ahorrar al mes para llegar a la fecha objetivo; dinero total sin asignar.
- S5 (L1, verbatim): "gráficas y todo lo posible" — resumen mensual con KPIs (ingresos, gastos, ahorro neto, tasa de ahorro, comparación con el mes anterior), barras ingresos/gastos de 12 meses, donut de gasto por categoría, línea de patrimonio (saldo acumulado de cuentas), gasto diario acumulado frente a presupuesto, barras de presupuesto por categoría. Gráficas SVG propias (sin dependencias nuevas), con tooltip, accesibles por teclado y con tabla alternativa.
- S6: export/import JSON incluye las tablas nuevas; exports antiguos sin ellas siguen importando.

## Tasks

| ID | Specs | Ruta | Estado | Commit |
| -- | ----- | ---- | ------ | ------ |
| T1 | S2, S3, S4, S5, S6 (backend: tablas, migración, dominio, servicio, rutas, export) | inline | hecho | 845dec2 |
| T2 | S5 (componentes de gráficas + tokens de serie) | inline | hecho | f7aa2ec |
| T3 | S2, S3, S4, S5 (página con pestañas) | inline | hecho | 0644601 |
| T4 | cierre: PLAN.md, typecheck/lint/test/e2e | inline | hecho | (este commit) |

## Log

- L1 (2026-10-30): "Propon 10 mejoras, y añade una interfaz completa para llevar gastos, metas, poder poner dinero asignado a metas etc, gráficas y todo lo posible"
- L2: decisión — se reutilizan `finance_entries` con `goalId` para asignar/retirar dinero de metas (sin tabla nueva); las transacciones de gasto/ingreso son una tabla aparte porque no son aportaciones a una cuenta de inversión. Ruta inline: ningún disparador de escritor (unidades dependientes entre sí).
- L3: verificación — typecheck/lint limpios; vitest 358/358; e2e finanzas + axe con gráficas en verde. Axe con datos detectó `nested-interactive` y `aria-prohibited-attr` en las gráficas (corregido). Capturas revelaron que Tailwind v4 eliminaba `--color-chart-*` dentro de `@theme` (movidas a `:root`) y desbordamiento en móvil (corregido).
- L4: fallos e2e ajenos — `shell.spec.ts:93` falla también en `a805329`; `notes.spec.ts:103` intermitente en suite completa, pasa aislado.
