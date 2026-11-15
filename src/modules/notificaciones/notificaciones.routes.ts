import { Router } from 'express';
import * as controller from './notificaciones.controller.js';
import { requireAuth } from '../../middlewares/auth.js';

export const notificacionesRoutes = Router();
notificacionesRoutes.use(requireAuth);
notificacionesRoutes.get('/', controller.listar);
