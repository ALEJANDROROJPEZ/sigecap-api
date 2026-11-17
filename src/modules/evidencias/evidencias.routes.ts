import { Router } from 'express';
import * as controller from './evidencias.controller.js';
import { dictaminarSchema, listarEvidenciasSchema } from './evidencias.schemas.js';
import { validate } from '../../middlewares/validate.js';
import { requireAuth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/roles.js';
import { subirPdf } from '../../middlewares/upload.js';
import { idParam } from '../../shared/validaciones.js';

export const evidenciasRoutes = Router();
evidenciasRoutes.use(requireAuth);
// Cualquier usuario sube sus propias constancias
evidenciasRoutes.post('/', subirPdf, controller.subir);
// Consulta general y dictamen: administrador
evidenciasRoutes.get('/', requireRole('ADMINISTRADOR'), validate(listarEvidenciasSchema, 'query'), controller.listar);
evidenciasRoutes.patch('/:id', requireRole('ADMINISTRADOR'), validate(idParam, 'params'), validate(dictaminarSchema), controller.dictaminar);
// Detalle y archivo: administrador o propietario (se verifica en el servicio)
evidenciasRoutes.get('/:id', validate(idParam, 'params'), controller.obtener);
evidenciasRoutes.get('/:id/archivo', validate(idParam, 'params'), controller.archivo);
