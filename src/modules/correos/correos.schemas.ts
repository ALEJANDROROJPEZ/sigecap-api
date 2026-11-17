import { z } from 'zod';
import { paginacion } from '../../shared/validaciones.js';

export const actualizarPlantillaSchema = z.object({
  asunto: z.string().trim().min(3).max(200),
  cuerpoHtml: z.string().trim().min(10).max(20000),
});
export const listarEnviosSchema = z.object({ ...paginacion });
export const probarCorreoSchema = z.object({ para: z.email('Correo inválido') });

export type ActualizarPlantilla = z.infer<typeof actualizarPlantillaSchema>;
