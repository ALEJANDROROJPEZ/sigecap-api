import { Router } from 'express';
import * as controller from './usuarios.controller.js';
import { actualizarUsuarioSchema, crearUsuarioSchema, listarUsuariosSchema } from './usuarios.schemas.js';
import { validate } from '../../middlewares/validate.js';
import { requireAuth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/roles.js';
import { idParam } from '../../shared/validaciones.js';

export const usuariosRoutes = Router();
usuariosRoutes.use(requireAuth, requireRole('ADMINISTRADOR'));
usuariosRoutes.get('/', validate(listarUsuariosSchema, 'query'), controller.listar);
usuariosRoutes.post('/', validate(crearUsuarioSchema), controller.crear);
usuariosRoutes.post('/faltantes', controller.crearFaltantes);
usuariosRoutes.patch('/:id', validate(idParam, 'params'), validate(actualizarUsuarioSchema), controller.actualizar);
usuariosRoutes.post('/:id/restablecer', validate(idParam, 'params'), controller.restablecer);
