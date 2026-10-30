# Fase 19 — Mejoras de UI y finanzas (10 propuestas) + auditoría de mejoras

Objetivo: implementar las 10 propuestas de UI de la fase 18 y buscar ≥5 hallazgos por categoría (arreglos, UI, mejoras, implementaciones nuevas, nuevas configuraciones).
Rama: `feat/ui-improvements` (desde `feat/finance-budgets`). Entrega: `ask-on-risk`. Runner: `vitest` + `playwright`.

## Specs

- S1: "Apuntar un gasto en dos toques. Un botón flotante en móvil y que la paleta de comandos entienda "gasto 12,50 café"."
- S2: "Categorías recientes como botones en el diálogo de gasto, en vez del desplegable"
- S3: "Pulsar un segmento del donut o una barra de presupuesto y saltar a Movimientos con ese filtro ya puesto."
- S4: "Iconos por categoría (lucide) además del color"
- S5: "Deshacer al borrar un movimiento (un toast con "Deshacer") en lugar de la confirmación en línea"
- S6: "Hoy con widget financiero: gasto del mes frente al presupuesto y la meta más próxima."
- S7: "Barra inferior móvil configurable: que puedas poner Finanzas en lugar de, por ejemplo, Calendario."
- S8: "Estados vacíos con ejemplo, una vista previa en gris de cómo se verá la pantalla con datos"
- S9: "Coherencia de cabeceras: … Unificarlas daría el mismo ritmo visual en todas."
- S10: "Arreglar el test de teclado roto (shell.spec.ts)"
- S11: "busca mínimo 5 mejoras más de cada uno de estos: arreglos, UI, mejoras, implementaciones nuevas, nuevas configuraciones" — entregadas como propuesta con evidencia (path:line); implementación sujeta a confirmación del usuario (asunción: "busca" = proponer).

## Tasks

| ID | Specs | Ruta | Estado | Commit |
| -- | ----- | ---- | ------ | ------ |
| T1 | S2, S3, S5 (finanzas: chips, saltos filtrados, deshacer) | inline | pendiente | |
| T2 | S4 (iconos de categoría, migración aditiva) | inline | pendiente | |
| T3 | S1 (FAB móvil + comando "gasto") | inline | pendiente | |
| T4 | S6 (widget de finanzas en Hoy) | inline | pendiente | |
| T5 | S7 (barra inferior configurable) | inline | pendiente | |
| T6 | S8, S9 (vistas previas en vacíos, cabeceras) | inline | pendiente | |
| T7 | S10 (test de teclado) | inline | pendiente | |
| T8 | S11 (auditoría) | explorador | pendiente | |

## Log

- L1 (2026-10-30): "Implementalo todo, y busca mínimo 5 mejoras más de cada uno de estos:arreglos, UI, mejoras, implementaciones nuevas, nuevas configuraciones"
- L2: ruta — un explorador mapea S1/S6/S7/S9/S10 (más de 5 búsquedas secuenciales) y otro audita S11; la escritura sigue inline (unidades pequeñas que comparten archivos de finanzas).
