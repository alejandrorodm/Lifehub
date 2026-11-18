# Fase 21 — Rediseño "cálido y amable" e intuitivo

Objetivo: rediseñar la app para que sea atractiva y muy intuitiva, con todas las acciones a mano.
Rama: `feat/warm-redesign` (desde `feat/mobile-redesign-shopping`). Entrega: `ask-on-risk`, commits por unidad de trabajo. Tests: `vitest` (`npm test`), `playwright` (`npm run test:e2e`).

## Specs

- S1. "Rediseña completamente la aplicación para que sea atractiva" — dirección elegida por el usuario: "Cálido y amable" (fondos crema/arena, acento cálido terracota, esquinas más redondeadas, color por sección). Ambos temas (claro y oscuro cálido) con contraste AA.
- S2. Color por sección: cada sección (Hoy, Inbox, Tareas, Calendario, Notas, Diario, Proyectos, Hábitos, Finanzas, Compra, Mercados, Revisión, Ajustes) tiene un color propio, usado en navegación, cabecera de página y widgets de inicio. Definido como tokens, nunca valores sueltos.
- S3. Primitivas (`components/ui`) con el nuevo lenguaje: superficies con sombra suave cálida, radios mayores, cabecera de página con icono de sección.
- S4. "muy intuitiva para el usuario" — navegación (barra lateral, barra inferior, menú "Más") con iconos de color por sección y estado activo claro.
- S5. "poder realizar todas las tareas de manera sencilla" — un botón "Crear" siempre a mano (móvil y escritorio) que abre un menú con las acciones habituales: tarea, movimiento, artículo de compra, nota, evento, hábito y captura al inbox; cada una lleva directamente al formulario o campo de alta.
- S6. Inicio: saludo destacado, accesos rápidos de color por sección con contadores, widgets con cabecera de color.
- S7. Cierre: skill `lifehub-ui` y `PLAN.md` actualizados; typecheck, lint, test, e2e y capturas Mobile/Desktop en claro y oscuro.

## Tasks

| ID | Specs | Ruta | Estado | Commit |
| -- | ----- | ---- | ------ | ------ |
| T1 | S1, S2 | inline | ✅ tokens: paleta cálida, colores de sección, radios, sombras | a8e7b80 |
| T2 | S3 | inline | ✅ primitivas | a8e7b80 |
| T3 | S4 | inline | ✅ shell y navegación por color | 5729d45 |
| T4 | S5 | inline | ✅ menú "Crear" y `?new` en las secciones | 5729d45 |
| T5 | S6, S2 | inline | ✅ inicio | b6b230e |
| T6 | S2, S3 | inline | ✅ icono de sección en cabeceras | 5729d45 |
| T7 | S7 | inline | ✅ cierre | docs |

Rutas: inline. Las unidades comparten tokens y primitivas (no son independientes), así que no hay razón para delegar escritores.

## Log

- L1 (2026-11-18, usuario): "Rediseña completamente la aplicación para que sea atractiva y muy intuitiva para el usuario y poder realizar todas las tareas de manera sencilla"
- L2 (2026-11-18, usuario): elige la dirección visual "Cálido y amable" (frente a "Vivo y colorido", "Mantener sobrio, mejorar UX" y "Oscuro premium").
- L3 (2026-11-18): verificado — typecheck y lint limpios, vitest 401/401 (RED observado en los 5 tests nuevos antes de implementar), e2e 86/86, capturas Mobile/Desktop en claro y oscuro. Ajustes tras capturas: baldosas de "Crear" en vertical en móvil (las descripciones se cortaban) y fecha de inicio con solo la primera letra en mayúscula.
