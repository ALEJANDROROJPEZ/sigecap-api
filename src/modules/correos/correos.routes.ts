import { Router } from 'express';
import * as controller from './correos.controller.js';
import { actualizarPlantillaSchema, listarEnviosSchema, probarCorreoSchema } from './correos.schemas.js';
import { validate } from '../../middlewares/validate.js';
import { requireAuth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/roles.js';
import { idParam } from '../../shared/validaciones.js';

export const correosRoutes = Router();
correosRoutes.use(requireAuth, requireRole('ADMINISTRADOR'));
correosRoutes.get('/plantillas', controller.listarPlantillas);
correosRoutes.put('/plantillas/:id', validate(idParam, 'params'), validate(actualizarPlantillaSchema), controller.actualizarPlantilla);
correosRoutes.post('/plantillas/:id/restaurar', validate(idParam, 'params'), controller.restaurarPlantilla);
correosRoutes.get('/envios', validate(listarEnviosSchema, 'query'), controller.listarEnvios);
correosRoutes.post('/prueba', validate(probarCorreoSchema), controller.probar);
