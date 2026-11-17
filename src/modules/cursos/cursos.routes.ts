import { Router } from 'express';
import * as controller from './cursos.controller.js';
import {
  actualizarCursoSchema, crearCursoSchema, estadoCursoSchema, listarCursosSchema, misCursosSchema,
} from './cursos.schemas.js';
import { validate } from '../../middlewares/validate.js';
import { requireAuth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/roles.js';
import { idParam } from '../../shared/validaciones.js';

// /cursos: catálogo de cursos (administrador)
export const cursosRoutes = Router();
cursosRoutes.use(requireAuth, requireRole('ADMINISTRADOR'));
cursosRoutes.get('/', validate(listarCursosSchema, 'query'), controller.listar);
cursosRoutes.post('/', validate(crearCursoSchema), controller.crear);
cursosRoutes.get('/anios', controller.anios);
cursosRoutes.get('/:id', validate(idParam, 'params'), controller.obtener);
cursosRoutes.put('/:id', validate(idParam, 'params'), validate(actualizarCursoSchema), controller.actualizar);
cursosRoutes.patch('/:id/estado', validate(idParam, 'params'), validate(estadoCursoSchema), controller.cambiarEstado);

// /mis-cursos: cursos del usuario autenticado (todo usuario es también un empleado)
export const misCursosRoutes = Router();
misCursosRoutes.use(requireAuth);
misCursosRoutes.get('/', validate(misCursosSchema, 'query'), controller.misCursos);
misCursosRoutes.get('/catalogo', controller.catalogoHistorico);
