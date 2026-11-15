import { Router } from 'express';
import * as controller from './empleados.controller.js';
import { crearEmpleadoSchema, actualizarEmpleadoSchema, listarEmpleadosSchema } from './empleados.schemas.js';
import { validate } from '../../middlewares/validate.js';
import { requireAuth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/roles.js';
import { idParam } from '../../shared/validaciones.js';

export const empleadosRoutes = Router();
empleadosRoutes.use(requireAuth, requireRole('ADMINISTRADOR'));
empleadosRoutes.get('/', validate(listarEmpleadosSchema, 'query'), controller.listar);
empleadosRoutes.get('/:id', validate(idParam, 'params'), controller.obtener);
empleadosRoutes.post('/', validate(crearEmpleadoSchema), controller.crear);
empleadosRoutes.patch('/:id', validate(idParam, 'params'), validate(actualizarEmpleadoSchema), controller.actualizar);
empleadosRoutes.delete('/:id', validate(idParam, 'params'), controller.darDeBaja);
