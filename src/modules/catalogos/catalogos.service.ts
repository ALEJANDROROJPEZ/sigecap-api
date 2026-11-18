import { prisma } from '../../config/prisma.js';

// Catálogos que usan los formularios: sedes (ORE/SARE), áreas, dependencias y temas del Comité de Ética
export async function todos() {
  const [sedes, areas, dependencias, temasEtica, roles] = await Promise.all([
    prisma.sede.findMany({ orderBy: [{ tipo: 'asc' }, { clave: 'asc' }], include: { _count: { select: { empleados: true } } } }),
    prisma.area.findMany({ orderBy: { nombre: 'asc' }, include: { _count: { select: { empleados: true } } } }),
    prisma.dependencia.findMany({ orderBy: { siglas: 'asc' }, include: { _count: { select: { cursos: true } } } }),
    prisma.temaEtica.findMany({ orderBy: { codigo: 'asc' }, include: { _count: { select: { cursos: true } } } }),
    prisma.rol.findMany({ orderBy: { nombre: 'asc' } }),
  ]);
  return { sedes, areas, dependencias, temasEtica, roles };
}

export const tablas = {
  sedes: { entidad: 'sede', crear: (data: never) => prisma.sede.create({ data }), actualizar: (id: number, data: never) => prisma.sede.update({ where: { id }, data }) },
  areas: { entidad: 'area', crear: (data: never) => prisma.area.create({ data }), actualizar: (id: number, data: never) => prisma.area.update({ where: { id }, data }) },
  dependencias: { entidad: 'dependencia', crear: (data: never) => prisma.dependencia.create({ data }), actualizar: (id: number, data: never) => prisma.dependencia.update({ where: { id }, data }) },
  'temas-etica': { entidad: 'tema_etica', crear: (data: never) => prisma.temaEtica.create({ data }), actualizar: (id: number, data: never) => prisma.temaEtica.update({ where: { id }, data }) },
} as const;
export type Catalogo = keyof typeof tablas;
