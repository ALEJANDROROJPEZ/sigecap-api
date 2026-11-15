import { prisma } from '../../config/prisma.js';

// TODO: lógica de negocio de asignaciones
export const listar = () => prisma.asignacion.findMany({ take: 50 });
