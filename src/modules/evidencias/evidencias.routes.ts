import { Router } from 'express';
import * as controller from './evidencias.controller.js';
import { requireAuth } from '../../middlewares/auth.js';

export const evidenciasRoutes = Router();
evidenciasRoutes.use(requireAuth);
evidenciasRoutes.get('/', controller.listar);
