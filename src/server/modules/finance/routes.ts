import { Hono } from "hono";
import { parseOrThrow } from "../../lib/validate";
import {
  FinanceAssetCreateSchema,
  FinanceAssetPatchSchema,
  FinanceGoalCreateSchema,
  FinanceGoalPatchSchema,
  FinanceEntryCreateSchema,
  FinanceEntryPatchSchema,
  FinanceCategoryCreateSchema,
  FinanceCategoryPatchSchema,
  FinanceTransactionCreateSchema,
  FinanceTransactionPatchSchema,
  FinanceTransactionQuerySchema,
  FinanceSummaryQuerySchema,
} from "@shared/schemas/finance";
import * as service from "./service";

export const financeRoutes = new Hono()
  .get("/assets", (c) => c.json(service.listAssets()))
  .get("/assets/trash", (c) => c.json(service.listAssetsTrash()))
  .post("/assets", async (c) => {
    const body = parseOrThrow(FinanceAssetCreateSchema, await c.req.json().catch(() => ({})));
    return c.json(service.createAsset(body), 201);
  })
  .get("/assets/:id", (c) => c.json(service.getAsset(c.req.param("id"))))
  .patch("/assets/:id", async (c) => {
    const body = parseOrThrow(FinanceAssetPatchSchema, await c.req.json().catch(() => ({})));
    return c.json(service.updateAsset(c.req.param("id"), body));
  })
  .delete("/assets/:id", (c) => {
    service.deleteAsset(c.req.param("id"));
    return c.body(null, 204);
  })
  .post("/assets/:id/restore", (c) => c.json(service.restoreAsset(c.req.param("id"))))
  .get("/goals", (c) => c.json(service.listGoals()))
  .get("/goals/trash", (c) => c.json(service.listGoalsTrash()))
  .post("/goals", async (c) => {
    const body = parseOrThrow(FinanceGoalCreateSchema, await c.req.json().catch(() => ({})));
    return c.json(service.createGoal(body), 201);
  })
  .get("/goals/:id", (c) => c.json(service.getGoal(c.req.param("id"))))
  .patch("/goals/:id", async (c) => {
    const body = parseOrThrow(FinanceGoalPatchSchema, await c.req.json().catch(() => ({})));
    return c.json(service.updateGoal(c.req.param("id"), body));
  })
  .delete("/goals/:id", (c) => {
    service.deleteGoal(c.req.param("id"));
    return c.body(null, 204);
  })
  .post("/goals/:id/restore", (c) => c.json(service.restoreGoal(c.req.param("id"))))
  .post("/entries", async (c) => {
    const body = parseOrThrow(FinanceEntryCreateSchema, await c.req.json().catch(() => ({})));
    return c.json(service.createEntry(body), 201);
  })
  .patch("/entries/:id", async (c) => {
    const body = parseOrThrow(FinanceEntryPatchSchema, await c.req.json().catch(() => ({})));
    return c.json(service.updateEntry(c.req.param("id"), body));
  })
  .delete("/entries/:id", (c) => {
    service.deleteEntry(c.req.param("id"));
    return c.body(null, 204);
  })
  .get("/categories", (c) => c.json(service.listCategories()))
  .get("/categories/trash", (c) => c.json(service.listCategoriesTrash()))
  .post("/categories", async (c) => {
    const body = parseOrThrow(FinanceCategoryCreateSchema, await c.req.json().catch(() => ({})));
    return c.json(service.createCategory(body), 201);
  })
  .post("/categories/suggested", (c) => c.json(service.createSuggestedCategories(), 201))
  .patch("/categories/:id", async (c) => {
    const body = parseOrThrow(FinanceCategoryPatchSchema, await c.req.json().catch(() => ({})));
    return c.json(service.updateCategory(c.req.param("id"), body));
  })
  .delete("/categories/:id", (c) => {
    service.deleteCategory(c.req.param("id"));
    return c.body(null, 204);
  })
  .post("/categories/:id/restore", (c) => c.json(service.restoreCategory(c.req.param("id"))))
  .get("/transactions", (c) => {
    const query = parseOrThrow(FinanceTransactionQuerySchema, c.req.query());
    return c.json(service.listTransactions(query));
  })
  .post("/transactions", async (c) => {
    const body = parseOrThrow(FinanceTransactionCreateSchema, await c.req.json().catch(() => ({})));
    return c.json(service.createTransaction(body), 201);
  })
  .patch("/transactions/:id", async (c) => {
    const body = parseOrThrow(FinanceTransactionPatchSchema, await c.req.json().catch(() => ({})));
    return c.json(service.updateTransaction(c.req.param("id"), body));
  })
  .delete("/transactions/:id", (c) => {
    service.deleteTransaction(c.req.param("id"));
    return c.body(null, 204);
  })
  .get("/summary", (c) => {
    const query = parseOrThrow(FinanceSummaryQuerySchema, c.req.query());
    return c.json(service.getSummary(query.month));
  });
