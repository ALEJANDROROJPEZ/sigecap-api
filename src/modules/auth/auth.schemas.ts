import { z } from 'zod';

export const loginSchema = z.object({
  // Correo institucional o CURP (para el personal sin correo institucional)
  identificador: z.string().trim().min(5),
  contrasena: z.string().min(8),
});
export type LoginInput = z.infer<typeof loginSchema>;
