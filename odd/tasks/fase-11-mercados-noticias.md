# Fase 11 — Mercados: noticias de crypto/acciones y objetivos de precio

Objetivo: resumen de noticias de crypto y acciones, y una lista de seguimiento con objetivo de precio por moneda/activo. Rama: ninguna (se trabaja en `main`, igual que fases 9 y 10; commit solo bajo confirmación explícita del usuario). Runner de tests: `npx vitest run` / `npx playwright test`.

## Specs

- S1: "Quiero un resumen de las ultimas noticias de Crypto y de Acciones"
- S2: "y poder poner ciertos objetivos de precio de cada moneda, activo etc"
- S3 (decisión de fuente de datos, elegida explícitamente entre dos alternativas presentadas): "Solo APIs/RSS sin clave" — CoinGecko (cripto, sin clave) + endpoint público de Yahoo Finance (acciones) + RSS de noticias, sin API keys ni `.env` nuevo.

## Tasks

| ID | Specs | Ruta | Estado | Evidencia |
|----|-------|------|--------|-----------|
| T1 | S1-S3 | inline | hecho | `src/shared/schemas/markets.ts` |
| T2 | S2 | inline | hecho | `src/server/db/schema/markets.ts` (tabla `watchlist_assets`) + migración `0003_shocking_yellow_claw.sql` |
| T3 | S2 | inline | hecho | `src/shared/domain/markets.ts` + `markets.test.ts` (4 tests) |
| T4 | S2, S3 | inline | hecho | `src/server/modules/markets/quotes.ts` (CoinGecko + Yahoo Finance, caché 2 min) + `quotes.test.ts` (6 tests, `fetch` mockeado) |
| T5 | S1, S3 | inline | hecho | `src/server/modules/markets/news.ts` (RSS CoinDesk/Cointelegraph/MarketWatch vía `fast-xml-parser`, caché 15 min) + `news.test.ts` (4 tests) |
| T6 | S1-S3 | inline | hecho | `src/server/modules/markets/service.ts` + `service.test.ts` (5 tests) + `routes.ts` |
| T7 | S2 | inline | hecho | wiring en `app.ts`; `watchlistAssets` añadido a `data.ts`/`export.ts`/`import.ts` como contenido normal |
| T8 | S1, S2 | inline | hecho | `src/client/features/markets/useMarkets.ts` + `price.ts` + `MarketsPage.tsx` (noticias por pestañas + watchlist con progreso hacia el objetivo) |
| T9 | S1, S2 | inline | hecho | `navigation.ts` + `router.tsx` (`/markets`) |
| T10 | — | inline | hecho | `PLAN.md`/`README.md` actualizados |
| T11 | — | inline | hecho | verificación final (ver Log L4) |

## Log

- L1 (2026-10-19): Petición original del usuario, verbatim: "Quiero un resumen de las ultimas noticias de Crypto y de Acciones, y poder poner ciertos objetivos de precio de cada moneda, activo etc".
- L2 (2026-10-19): Antes de diseñar, se confirmó con el usuario (pregunta enfocada, única decisión de producto real abierta) la fuente de datos: elegida "Solo APIs/RSS sin clave" frente a la alternativa con API keys (NewsAPI/Alpha Vantage/Finnhub). Implica: sin `.env` nuevo, sin secretos, pero cobertura/fiabilidad sujeta a endpoints no oficiales (Yahoo Finance chart endpoint) y límites de peticiones gratuitos (CoinGecko). Se documentará como límite conocido, igual que el tope de 100 commits de GitHub en la fase 10.
- L3 (2026-10-19): Decisión de diseño: esto es una lista de seguimiento nueva (`watchlist_assets`), no una extensión de `finance_assets` — las finanzas de la fase 10 excluyen deliberadamente precios en vivo/valoración de mercado (ver `src/server/db/schema/finance.ts`); mezclar ambos conceptos rompería esa decisión ya tomada.
- L4 (2026-10-19): Implementación completa y verificada. A diferencia de las fases 9/10, en este entorno de desarrollo SÍ hubo acceso real a internet: se comprobó contra las APIs/feeds reales (no solo mockeados) antes de cerrar la tarea. Hallazgo real durante esa prueba: `fast-xml-parser` no decodifica por defecto referencias de carácter HTML (`&#x2019;`) — solo las 5 entidades XML básicas; títulos de MarketWatch las usan. Corregido con `htmlEntities: true` en el `XMLParser`, con test de regresión en `news.test.ts`.
  - `npx tsc --noEmit`, `npx eslint .` — sin errores.
  - `npx vitest run` — 172/172 (19 nuevos: 4 de `computeTargetProgress`, 5 de CRUD de la watchlist, 6 de cotizaciones, 4 de noticias).
  - `npx playwright test` con `.e2e-data/` limpio — 46/46 ejecutados en los 3 viewports (74 omitidos por diseño, +2 por la pantalla nueva en `a11y.spec.ts`); axe sin violaciones críticas en `/markets`.
  - Smoke test manual contra el servidor real (`npm run dev`) y las APIs reales: creación de activos, `GET /markets/quotes` (BTC vía CoinGecko, AAPL vía Yahoo Finance) y `GET /markets/news` (20 items de crypto, 10 de acciones) devolvieron datos correctos.
  - No se pudo probar con el navegador (Claude in Chrome no está conectado en este entorno); la cobertura de UI se apoya en el smoke test de API real + la suite de accesibilidad de Playwright + revisión de código.
