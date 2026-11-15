import { prisma } from '../../config/prisma.js';

// TODO: lógica de negocio de cursos
export const listar = () => prisma.curso.findMany({ take: 50 });
