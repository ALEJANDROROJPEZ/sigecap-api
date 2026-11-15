import { Router } from 'express';
import * as controller from './asignaciones.controller.js';
import { requireAuth } from '../../middlewares/auth.js';

export const asignacionesRoutes = Router();
asignacionesRoutes.use(requireAuth);
asignacionesRoutes.get('/', controller.listar);
