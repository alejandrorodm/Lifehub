import { Hono } from "hono";
import { parseOrThrow } from "../../lib/validate";
import { WatchlistAssetCreateSchema, WatchlistAssetPatchSchema } from "@shared/schemas/markets";
import * as service from "./service";
import { getQuotes } from "./quotes";
import { getNewsSummary } from "./news";

export const marketsRoutes = new Hono()
  .get("/watchlist", (c) => c.json(service.listWatchlistAssets()))
  .get("/watchlist/trash", (c) => c.json(service.listWatchlistAssetsTrash()))
  .post("/watchlist", async (c) => {
    const body = parseOrThrow(WatchlistAssetCreateSchema, await c.req.json().catch(() => ({})));
    return c.json(service.createWatchlistAsset(body), 201);
  })
  .get("/watchlist/:id", (c) => c.json(service.getWatchlistAsset(c.req.param("id"))))
  .patch("/watchlist/:id", async (c) => {
    const body = parseOrThrow(WatchlistAssetPatchSchema, await c.req.json().catch(() => ({})));
    return c.json(service.updateWatchlistAsset(c.req.param("id"), body));
  })
  .delete("/watchlist/:id", (c) => {
    service.deleteWatchlistAsset(c.req.param("id"));
    return c.body(null, 204);
  })
  .post("/watchlist/:id/restore", (c) => c.json(service.restoreWatchlistAsset(c.req.param("id"))))
  .get("/quotes", async (c) => c.json(await getQuotes(service.listWatchlistAssets())))
  .get("/news", async (c) => c.json(await getNewsSummary()));
