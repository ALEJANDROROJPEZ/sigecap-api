import { Router } from 'express';
import * as controller from './empleados.controller.js';
import {
  actualizarEmpleadoSchema, crearEmpleadoSchema, estadoSchema, importarSchema, listarEmpleadosSchema,
} from './empleados.schemas.js';
import { validate } from '../../middlewares/validate.js';
import { requireAuth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/roles.js';
import { subirExcel } from '../../middlewares/upload.js';
import { idParam } from '../../shared/validaciones.js';

export const empleadosRoutes = Router();
empleadosRoutes.use(requireAuth, requireRole('ADMINISTRADOR'));
empleadosRoutes.get('/', validate(listarEmpleadosSchema, 'query'), controller.listar);
empleadosRoutes.post('/', validate(crearEmpleadoSchema), controller.crear);
empleadosRoutes.get('/plantilla', controller.plantilla);
empleadosRoutes.post('/importar', validate(importarSchema, 'query'), subirExcel, controller.importar);
empleadosRoutes.get('/:id', validate(idParam, 'params'), controller.obtener);
empleadosRoutes.put('/:id', validate(idParam, 'params'), validate(actualizarEmpleadoSchema), controller.actualizar);
empleadosRoutes.patch('/:id', validate(idParam, 'params'), validate(actualizarEmpleadoSchema), controller.actualizar);
empleadosRoutes.patch('/:id/estado', validate(idParam, 'params'), validate(estadoSchema), controller.cambiarEstado);
empleadosRoutes.delete('/:id', validate(idParam, 'params'), controller.cambiarEstado);
