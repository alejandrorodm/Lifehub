import { z } from "zod";

export const LoginInputSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio."),
  password: z.string().min(1, "La contraseña es obligatoria."),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export interface SessionUserDto {
  id: string;
  name: string;
}
