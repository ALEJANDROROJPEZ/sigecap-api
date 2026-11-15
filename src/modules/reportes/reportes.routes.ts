import { Router } from 'express';
import * as controller from './reportes.controller.js';
import { requireAuth } from '../../middlewares/auth.js';

export const reportesRoutes = Router();
reportesRoutes.use(requireAuth);
reportesRoutes.get('/', controller.listar);
