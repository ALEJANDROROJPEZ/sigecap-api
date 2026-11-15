import { Router } from 'express';
import * as controller from './auth.controller.js';
import { loginSchema } from './auth.schemas.js';
import { validate } from '../../middlewares/validate.js';
import { requireAuth } from '../../middlewares/auth.js';

export const authRoutes = Router();
authRoutes.post('/login', validate(loginSchema), controller.login);
authRoutes.get('/me', requireAuth, controller.perfil);
