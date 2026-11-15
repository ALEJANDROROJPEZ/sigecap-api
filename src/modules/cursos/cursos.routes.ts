import { Router } from 'express';
import * as controller from './cursos.controller.js';
import { requireAuth } from '../../middlewares/auth.js';

export const cursosRoutes = Router();
cursosRoutes.use(requireAuth);
cursosRoutes.get('/', controller.listar);
