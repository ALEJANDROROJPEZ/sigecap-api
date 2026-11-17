import { Router } from 'express';
import * as controller from './reportes.controller.js';
import { dashboardSchema, exportarSchema, rezagadosSchema } from './reportes.schemas.js';
import { validate } from '../../middlewares/validate.js';
import { requireAuth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/roles.js';

export const reportesRoutes = Router();
reportesRoutes.use(requireAuth, requireRole('ADMINISTRADOR'));
reportesRoutes.get('/dashboard', validate(dashboardSchema, 'query'), controller.dashboard);
reportesRoutes.get('/rezagados', validate(rezagadosSchema, 'query'), controller.rezagados);
reportesRoutes.get('/exportar', validate(exportarSchema, 'query'), controller.exportar);
