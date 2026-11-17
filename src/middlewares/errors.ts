import type { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';
import { env } from '../config/env.js';
import { HttpError } from '../shared/http-error.js';

export function notFound(req: Request, res: Response) {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: z.flattenError(err).fieldErrors });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, detalles: err.detalles });
  }
  const e = err as { code?: string; name?: string; type?: string };
  if (e?.name === 'MulterError') {
    const mensaje = e.code === 'LIMIT_FILE_SIZE'
      ? `El archivo supera el tamaño máximo de ${env.MAX_UPLOAD_MB} MB`
      : 'No se pudo procesar el archivo enviado';
    return res.status(e.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: mensaje });
  }
  if (e?.type === 'entity.parse.failed') return res.status(400).json({ error: 'El cuerpo de la petición no es JSON válido' });
  if (e?.code === 'P2002') return res.status(409).json({ error: 'Ya existe un registro con ese valor único' });
  if (e?.code === 'P2003') return res.status(409).json({ error: 'El registro está relacionado con otros datos y no puede modificarse así' });
  if (e?.code === 'P2025') return res.status(404).json({ error: 'Registro no encontrado' });
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
}
