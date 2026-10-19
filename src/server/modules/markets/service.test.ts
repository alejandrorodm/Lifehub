import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let tmpDir: string;
let markets: typeof import("./service");
let getDb: typeof import("../../db/client").getDb;
let closeDb: typeof import("../../db/client").closeDb;

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lifehub-markets-test-"));
  process.env.LIFEHUB_DATA_DIR = tmpDir;

  const { runMigrations } = await import("../../db/migrate");
  runMigrations();

  markets = await import("./service");
  const client = await import("../../db/client");
  getDb = client.getDb;
  closeDb = client.closeDb;
});

afterAll(() => {
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.LIFEHUB_DATA_DIR;
});

beforeEach(() => {
  getDb().run("delete from watchlist_assets");
});

describe("watchlist", () => {
  it("crea un activo sin objetivo de precio", () => {
    const asset = markets.createWatchlistAsset({ type: "crypto", symbol: "BTC", name: "Bitcoin" });
    expect(asset.targetPrice).toBeNull();
    expect(markets.listWatchlistAssets()).toHaveLength(1);
  });

  it("crea un activo con objetivo de precio", () => {
    const asset = markets.createWatchlistAsset({ type: "stock", symbol: "AAPL", name: "Apple", targetPrice: 300 });
    expect(markets.getWatchlistAsset(asset.id).targetPrice).toBe(300);
  });

  it("actualiza el objetivo de precio, incluido quitarlo (null)", () => {
    const asset = markets.createWatchlistAsset({ type: "crypto", symbol: "ETH", name: "Ethereum", targetPrice: 5000 });
    markets.updateWatchlistAsset(asset.id, { targetPrice: 6000 });
    expect(markets.getWatchlistAsset(asset.id).targetPrice).toBe(6000);

    markets.updateWatchlistAsset(asset.id, { targetPrice: null });
    expect(markets.getWatchlistAsset(asset.id).targetPrice).toBeNull();
  });

  it("archivar (papelera) y restaurar un activo", () => {
    const asset = markets.createWatchlistAsset({ type: "crypto", symbol: "SOL", name: "Solana" });
    markets.deleteWatchlistAsset(asset.id);

    expect(markets.listWatchlistAssets()).toHaveLength(0);
    expect(markets.listWatchlistAssetsTrash()).toHaveLength(1);
    expect(() => markets.getWatchlistAsset(asset.id)).toThrow();

    markets.restoreWatchlistAsset(asset.id);
    expect(markets.listWatchlistAssets()).toHaveLength(1);
  });

  it("borrar un activo inexistente lanza NOT_FOUND", () => {
    expect(() => markets.deleteWatchlistAsset("no-existe")).toThrow();
  });
});
