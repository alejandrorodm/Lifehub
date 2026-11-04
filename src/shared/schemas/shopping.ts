import { z } from "zod";

const nameShape = z.string().trim().min(1, "El nombre es obligatorio.").max(200);
const quantityShape = z.string().trim().max(50);

export const ShoppingListCreateSchema = z.object({ name: nameShape });
export type ShoppingListCreateInput = z.infer<typeof ShoppingListCreateSchema>;

export const ShoppingListPatchSchema = z.object({ name: nameShape });
export type ShoppingListPatchInput = z.infer<typeof ShoppingListPatchSchema>;

export const ShoppingItemCreateSchema = z.object({
  name: nameShape,
  quantity: quantityShape.nullable().optional(),
});
export type ShoppingItemCreateInput = z.infer<typeof ShoppingItemCreateSchema>;

export const ShoppingItemPatchSchema = z
  .object({
    name: nameShape,
    quantity: quantityShape.nullable(),
    checked: z.boolean(),
  })
  .partial();
export type ShoppingItemPatchInput = z.infer<typeof ShoppingItemPatchSchema>;

export interface ShoppingListDto {
  id: string;
  name: string;
  position: number;
  /** Artículos totales y pendientes de comprar. */
  itemCount: number;
  pendingCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingItemDto {
  id: string;
  listId: string;
  name: string;
  quantity: string | null;
  checked: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}
