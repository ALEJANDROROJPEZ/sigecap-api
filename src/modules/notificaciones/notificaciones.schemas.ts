import { z } from 'zod';
import { BOOL_QUERY, paginacion } from '../../shared/validaciones.js';

export const listarNotificacionesSchema = z.object({
  soloNoLeidas: BOOL_QUERY,
  ...paginacion,
});
