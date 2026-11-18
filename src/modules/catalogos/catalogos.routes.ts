import { Router } from 'express';
import type { ZodType } from 'zod';
import * as controller from './catalogos.controller.js';
import { areaSchema, dependenciaSchema, sedeSchema, temaEticaSchema } from './catalogos.schemas.js';
import type { Catalogo } from './catalogos.service.js';
import { validate } from '../../middlewares/validate.js';
import { requireAuth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/roles.js';
import { idParam } from '../../shared/validaciones.js';

export const catalogosRoutes = Router();
catalogosRoutes.use(requireAuth);
// Consulta: cualquier usuario autenticado (los formularios los necesitan)
catalogosRoutes.get('/', controller.todos);

// Altas y cambios: solo administradores
const esquemas: Record<Catalogo, ZodType> = {
  sedes: sedeSchema, areas: areaSchema, dependencias: dependenciaSchema, 'temas-etica': temaEticaSchema,
};
for (const [catalogo, esquema] of Object.entries(esquemas) as [Catalogo, ZodType][]) {
  catalogosRoutes.post(`/${catalogo}`, requireRole('ADMINISTRADOR'), validate(esquema), controller.crear(catalogo));
  catalogosRoutes.put(`/${catalogo}/:id`, requireRole('ADMINISTRADOR'), validate(idParam, 'params'), validate(esquema), controller.actualizar(catalogo));
}
