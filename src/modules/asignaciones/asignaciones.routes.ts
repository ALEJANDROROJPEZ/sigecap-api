import { Router } from 'express';
import * as controller from './asignaciones.controller.js';
import { crearAsignacionSchema, estadoAsignacionSchema, listarAsignacionesSchema } from './asignaciones.schemas.js';
import { validate } from '../../middlewares/validate.js';
import { requireAuth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/roles.js';
import { idParam } from '../../shared/validaciones.js';

export const asignacionesRoutes = Router();
asignacionesRoutes.use(requireAuth, requireRole('ADMINISTRADOR'));
asignacionesRoutes.get('/', validate(listarAsignacionesSchema, 'query'), controller.listar);
asignacionesRoutes.post('/', validate(crearAsignacionSchema), controller.crear);
asignacionesRoutes.get('/:id', validate(idParam, 'params'), controller.obtener);
asignacionesRoutes.patch('/:id/estado', validate(idParam, 'params'), validate(estadoAsignacionSchema), controller.cambiarEstado);
asignacionesRoutes.post('/:id/correo', validate(idParam, 'params'), controller.enviarCorreo);
