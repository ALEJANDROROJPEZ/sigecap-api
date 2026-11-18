import { Router } from 'express';
import * as controller from './bitacora.controller.js';
import { listarBitacoraSchema } from './bitacora.schemas.js';
import { validate } from '../../middlewares/validate.js';
import { requireAuth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/roles.js';

export const bitacoraRoutes = Router();
bitacoraRoutes.use(requireAuth, requireRole('ADMINISTRADOR'));
bitacoraRoutes.get('/', validate(listarBitacoraSchema, 'query'), controller.listar);
bitacoraRoutes.get('/filtros', controller.filtros);
