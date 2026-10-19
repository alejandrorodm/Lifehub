/**
 * IDs fijos (no son secretos, solo identificadores estables) para los 2
 * perfiles de la instalación. Se usan en dos sitios que deben coincidir:
 * el script de alta (`npm run db:seed-users`) y el valor por el que se
 * retropobla `userId` en las migraciones que lo añaden a tablas con datos
 * ya existentes (ver fase 13, `odd/tasks/fase-13-perfiles-multiusuario.md`).
 */
export const SEED_USER_IDS = {
  alex: "00000000-0000-7000-8000-000000000001",
  ioana: "00000000-0000-7000-8000-000000000002",
} as const;
