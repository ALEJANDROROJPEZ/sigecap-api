import type { Request } from 'express';
import { prisma } from '../config/prisma.js';

interface Registro {
  accion: string;
  entidad: string;
  idEntidad?: number;
  antes?: unknown;
  despues?: unknown;
}

// Registra una acción en la bitácora de auditoría (no interrumpe la petición si falla)
export async function registrarBitacora(req: Request, r: Registro) {
  try {
    await prisma.bitacora.create({
      data: {
        idUsuario: req.usuario?.id ?? null,
        accion: r.accion,
        entidad: r.entidad,
        idEntidad: r.idEntidad ?? null,
        datosAnteriores: (r.antes ?? undefined) as object | undefined,
        datosNuevos: (r.despues ?? undefined) as object | undefined,
        ipOrigen: req.ip ?? null,
      },
    });
  } catch (err) {
    console.error('No se pudo registrar en bitácora:', err);
  }
}
