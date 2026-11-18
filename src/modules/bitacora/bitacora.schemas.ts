import { z } from 'zod';
import { FECHA, ID_QUERY, paginacion } from '../../shared/validaciones.js';

export const listarBitacoraSchema = z.object({
  buscar: z.string().trim().optional(),      // nombre o CUPO de quien realizó la acción
  idUsuario: ID_QUERY,
  accion: z.string().trim().max(40).optional(),
  entidad: z.string().trim().max(40).optional(),
  desde: FECHA.optional(),
  hasta: FECHA.optional(),
  ...paginacion,
});
export type ListarBitacora = z.infer<typeof listarBitacoraSchema>;
