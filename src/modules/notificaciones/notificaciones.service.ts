import { prisma } from '../../config/prisma.js';

// TODO: lógica de negocio de notificaciones
export const listar = () => prisma.notificacion.findMany({ take: 50 });
