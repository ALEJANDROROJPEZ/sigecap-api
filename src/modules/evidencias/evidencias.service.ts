import { prisma } from '../../config/prisma.js';

// TODO: lógica de negocio de evidencias
export const listar = () => prisma.evidencia.findMany({ take: 50 });
