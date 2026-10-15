import { Hono } from "hono";
import { listSnapshots } from "../../backup/snapshot";

// Exportación, copia manual y restauración llegan en la fase de "Ajustes y
// gestión de datos" (ver PLAN.md, fase 7). De momento solo se exponen en
// lectura las copias automáticas que ya se generan al arrancar el servidor.
export const dataRoutes = new Hono().get("/backups", (c) => c.json({ backups: listSnapshots() }));
