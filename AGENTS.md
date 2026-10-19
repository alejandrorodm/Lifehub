# AGENTS.md — Instrucciones permanentes para el desarrollo de LifeHub

Estas reglas aplican a cualquier agente o persona que trabaje en este repositorio. `PLAN.md` es la fuente de verdad sobre alcance, arquitectura y fases.

## Reglas

- Leer `PLAN.md` antes de trabajar; trabajar solo en la fase aprobada; actualizar el estado de la fase en `PLAN.md` al terminar.
- Stack fijado (sección 2); añadir dependencias solo con justificación escrita en el commit/PLAN.
- Toda lectura/escritura de datos pasa por `src/server/modules/*/service.ts`; las rutas solo validan y delegan; nada de SQL en rutas ni en el cliente.
- Esquemas Zod en `src/shared/schemas`, reutilizados por cliente y servidor; no duplicar tipos a mano.
- Lógica de dominio pura y con tests en `domain/`.
- Fechas: UTC para instantes, `YYYY-MM-DD` para fechas sin hora, zona del usuario desde ajustes; prohibido `new Date()` para "hoy" fuera de las utilidades compartidas.
- Cambios de esquema solo mediante migraciones drizzle-kit versionadas; nunca editar una migración ya aplicada.
- UI: usar tokens y componentes de `components/ui`; iconos lucide; sin emojis como iconos, sin gradientes decorativos, sin botones sin función; cada lista con estado de carga, vacío y error; acciones destructivas con confirmación o deshacer.
- Accesibilidad: elementos interactivos accesibles por teclado, con `aria-label` cuando no hay texto, foco visible.
- Textos de UI en español; código, nombres y commits en inglés (Conventional Commits).
- Sin telemetría, sin CDNs, sin secretos en el repo. Excepción explícita (fase 9, decisión consciente del usuario): integraciones opcionales y opt-in con servicios externos (Google Calendar, Web Push, GitHub en fase 10) están permitidas; sus credenciales viven solo en `.env` (nunca en el repo ni en el export JSON) y la app sigue funcionando por completo sin activarlas. Excepción explícita (fase 11): APIs/feeds públicos sin API key (CoinGecko, Yahoo Finance, RSS de noticias) para cotizaciones y noticias de mercados; sin credenciales que proteger, pero igual de "externo" — un fallo de cualquiera de ellos nunca debe romper la pantalla, solo mostrar el motivo.
- IA: nunca acceso directo a la BD; solo herramientas sobre services; escrituras como propuestas confirmadas por el usuario.
- Antes de dar por cerrada una tarea: `npm run typecheck && npm run lint && npm test` (y `npm run test:e2e` al cerrar fase). Informar resultados reales, distinguiendo implementado / probado / pendiente.
- Comandos: `dev`, `build`, `start`, `typecheck`, `lint`, `test`, `test:e2e`, `db:generate`, `db:migrate`, `db:seed-users`.
