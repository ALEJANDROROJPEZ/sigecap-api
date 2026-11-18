import { Router } from 'express';
import * as controller from './notificaciones.controller.js';
import { listarNotificacionesSchema } from './notificaciones.schemas.js';
import { validate } from '../../middlewares/validate.js';
import { requireAuth } from '../../middlewares/auth.js';
import { idParam } from '../../shared/validaciones.js';

// Cada usuario (administrador o empleado) solo ve y modifica sus propias notificaciones
export const notificacionesRoutes = Router();
notificacionesRoutes.use(requireAuth);
notificacionesRoutes.get('/', validate(listarNotificacionesSchema, 'query'), controller.listar);
notificacionesRoutes.patch('/leidas', controller.marcarTodasLeidas);
notificacionesRoutes.delete('/leidas', controller.eliminarLeidas);
notificacionesRoutes.patch('/:id/leida', validate(idParam, 'params'), controller.marcarLeida);
notificacionesRoutes.delete('/:id', validate(idParam, 'params'), controller.eliminar);
