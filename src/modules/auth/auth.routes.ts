import { Router } from 'express';
import * as controller from './auth.controller.js';
import {
  cambiarContrasenaSchema, contactoSchema, loginSchema, olvideSchema, preferenciasSchema, refreshSchema, restablecerSchema,
} from './auth.schemas.js';
import { validate } from '../../middlewares/validate.js';
import { requireAuth } from '../../middlewares/auth.js';

export const authRoutes = Router();
// Públicas
authRoutes.post('/login', validate(loginSchema), controller.login);
authRoutes.post('/refresh', validate(refreshSchema), controller.refrescar);
authRoutes.post('/forgot-password', validate(olvideSchema), controller.olvide);
authRoutes.post('/reset-password', validate(restablecerSchema), controller.restablecer);
// Del usuario autenticado
authRoutes.get('/me', requireAuth, controller.perfil);
authRoutes.post('/me/contrasena', requireAuth, validate(cambiarContrasenaSchema), controller.cambiarContrasena);
authRoutes.patch('/me/preferencias', requireAuth, validate(preferenciasSchema), controller.actualizarPreferencias);
authRoutes.patch('/me/contacto', requireAuth, validate(contactoSchema), controller.actualizarContacto);
