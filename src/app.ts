import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { notFound, errorHandler } from './middlewares/errors.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { empleadosRoutes } from './modules/empleados/empleados.routes.js';
import { cursosRoutes } from './modules/cursos/cursos.routes.js';
import { asignacionesRoutes } from './modules/asignaciones/asignaciones.routes.js';
import { evidenciasRoutes } from './modules/evidencias/evidencias.routes.js';
import { notificacionesRoutes } from './modules/notificaciones/notificaciones.routes.js';
import { reportesRoutes } from './modules/reportes/reportes.routes.js';

const openapi = JSON.parse(fs.readFileSync(new URL('./docs/openapi.json', import.meta.url), 'utf8'));

export const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/v1/health', (_req, res) => res.json({ estado: 'ok', fecha: new Date().toISOString() }));
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(openapi));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/empleados', empleadosRoutes);
app.use('/api/v1/cursos', cursosRoutes);
app.use('/api/v1/asignaciones', asignacionesRoutes);
app.use('/api/v1/evidencias', evidenciasRoutes);
app.use('/api/v1/notificaciones', notificacionesRoutes);
app.use('/api/v1/reportes', reportesRoutes);

app.use(notFound);
app.use(errorHandler);
