import { prisma } from '../../config/prisma.js';

// TODO: Concentrado de constancias y Formulario trimestral del Comité de Ética (exportación a Excel)
export async function listar() {
  const porEstado = await prisma.cursoEmpleado.groupBy({ by: ['estado'], _count: { _all: true } });
  return { porEstado };
}
