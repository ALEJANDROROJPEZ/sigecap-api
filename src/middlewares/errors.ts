import type { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';
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
  const code = (err as { code?: string })?.code;
  if (code === 'P2002') return res.status(409).json({ error: 'Ya existe un registro con ese valor único' });
  if (code === 'P2025') return res.status(404).json({ error: 'Registro no encontrado' });
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
}
