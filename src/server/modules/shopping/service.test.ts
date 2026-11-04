import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// LIFEHUB_DATA_DIR debe fijarse antes de importar módulos que lean la configuración.
let shopping: typeof import("./service");
let getDb: typeof import("../../db/client").getDb;
let closeDb: typeof import("../../db/client").closeDb;
let enterWithUserId: typeof import("../../lib/requestContext").enterWithUserId;
let exportData: typeof import("../../backup/export").exportData;
let restoreFromImport: typeof import("../../backup/import").restoreFromImport;
let parseImportOrThrow: typeof import("../../backup/import").parseImportOrThrow;
let tmpDir: string;

const USER_A = "shopping-user-a";
const USER_B = "shopping-user-b";

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lifehub-shopping-test-"));
  process.env.LIFEHUB_DATA_DIR = tmpDir;

  const { runMigrations } = await import("../../db/migrate");
  runMigrations();

  shopping = await import("./service");
  const client = await import("../../db/client");
  getDb = client.getDb;
  closeDb = client.closeDb;
  enterWithUserId = (await import("../../lib/requestContext")).enterWithUserId;
  exportData = (await import("../../backup/export")).exportData;
  const importModule = await import("../../backup/import");
  restoreFromImport = importModule.restoreFromImport;
  parseImportOrThrow = importModule.parseImportOrThrow;

  const { users } = await import("../../db/schema");
  getDb()
    .insert(users)
    .values([
      { id: USER_A, name: "A", passwordHash: "x" },
      { id: USER_B, name: "B", passwordHash: "x" },
    ])
    .run();
});

afterAll(() => {
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.LIFEHUB_DATA_DIR;
});

beforeEach(() => {
  enterWithUserId(USER_A);
  getDb().run("delete from shopping_items");
  getDb().run("delete from shopping_lists");
});

describe("listas", () => {
  it("crea listas con nombre y las devuelve en orden de creación con sus contadores", () => {
    const super_ = shopping.createList({ name: "Supermercado" });
    shopping.createList({ name: "Ferretería" });
    shopping.createItem(super_.id, { name: "Leche" });
    const pan = shopping.createItem(super_.id, { name: "Pan" });
    shopping.updateItem(pan.id, { checked: true });

    const lists = shopping.listLists();
    expect(lists.map((l) => l.name)).toEqual(["Supermercado", "Ferretería"]);
    expect(lists[0]).toMatchObject({ itemCount: 2, pendingCount: 1 });
    expect(lists[1]).toMatchObject({ itemCount: 0, pendingCount: 0 });
  });

  it("renombra una lista", () => {
    const list = shopping.createList({ name: "Super" });
    expect(shopping.renameList(list.id, { name: "Mercadona" }).name).toBe("Mercadona");
    expect(shopping.listLists()[0]!.name).toBe("Mercadona");
  });

  it("borrar una lista borra también sus artículos", () => {
    const list = shopping.createList({ name: "Super" });
    shopping.createItem(list.id, { name: "Leche" });
    shopping.deleteList(list.id);
    expect(shopping.listLists()).toEqual([]);
    expect(getDb().all("select * from shopping_items")).toEqual([]);
  });

  it("no deja ver ni tocar las listas de otro perfil", () => {
    const list = shopping.createList({ name: "Privada" });
    const item = shopping.createItem(list.id, { name: "Leche" });

    enterWithUserId(USER_B);
    expect(shopping.listLists()).toEqual([]);
    expect(() => shopping.listItems(list.id)).toThrow();
    expect(() => shopping.createItem(list.id, { name: "Intruso" })).toThrow();
    expect(() => shopping.updateItem(item.id, { checked: true })).toThrow();
    expect(() => shopping.deleteItem(item.id)).toThrow();
    expect(() => shopping.deleteList(list.id)).toThrow();

    enterWithUserId(USER_A);
    expect(shopping.listItems(list.id)).toHaveLength(1);
  });
});

describe("artículos", () => {
  it("añade artículos al final, con cantidad opcional", () => {
    const list = shopping.createList({ name: "Super" });
    shopping.createItem(list.id, { name: "Leche", quantity: "2" });
    shopping.createItem(list.id, { name: "Pan" });

    const items = shopping.listItems(list.id);
    expect(items.map((i) => [i.name, i.quantity, i.checked])).toEqual([
      ["Leche", "2", false],
      ["Pan", null, false],
    ]);
  });

  it("los comprados pasan al final de la lista", () => {
    const list = shopping.createList({ name: "Super" });
    const leche = shopping.createItem(list.id, { name: "Leche" });
    shopping.createItem(list.id, { name: "Pan" });
    shopping.updateItem(leche.id, { checked: true });

    expect(shopping.listItems(list.id).map((i) => i.name)).toEqual(["Pan", "Leche"]);
  });

  it("edita nombre y cantidad, y borra artículos", () => {
    const list = shopping.createList({ name: "Super" });
    const item = shopping.createItem(list.id, { name: "Lehce" });
    expect(shopping.updateItem(item.id, { name: "Leche", quantity: "1 l" })).toMatchObject({
      name: "Leche",
      quantity: "1 l",
    });
    shopping.deleteItem(item.id);
    expect(shopping.listItems(list.id)).toEqual([]);
  });

  it("vaciar comprados solo borra los marcados y devuelve cuántos", () => {
    const list = shopping.createList({ name: "Super" });
    const a = shopping.createItem(list.id, { name: "A" });
    shopping.createItem(list.id, { name: "B" });
    shopping.updateItem(a.id, { checked: true });

    expect(shopping.clearChecked(list.id)).toEqual({ removed: 1 });
    expect(shopping.listItems(list.id).map((i) => i.name)).toEqual(["B"]);
  });
});

describe("exportación", () => {
  it("exporta y restaura listas y artículos; los exports anteriores siguen importando", async () => {
    const list = shopping.createList({ name: "Super" });
    shopping.createItem(list.id, { name: "Leche", quantity: "2" });

    const exported = JSON.parse(JSON.stringify(exportData()));
    expect(exported.data.shoppingLists).toHaveLength(1);
    expect(exported.data.shoppingItems).toHaveLength(1);

    shopping.deleteList(list.id);
    await restoreFromImport(exported);
    expect(shopping.listLists()[0]).toMatchObject({ name: "Super", itemCount: 1 });
    expect(shopping.listItems(list.id)[0]).toMatchObject({ name: "Leche", quantity: "2" });

    delete exported.data.shoppingLists;
    delete exported.data.shoppingItems;
    const legacy = parseImportOrThrow(exported);
    expect(legacy.data.shoppingLists).toEqual([]);
    expect(legacy.data.shoppingItems).toEqual([]);
  });
});
