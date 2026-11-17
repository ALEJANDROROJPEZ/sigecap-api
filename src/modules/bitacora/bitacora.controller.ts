import type { Request, Response } from 'express';
import * as service from './bitacora.service.js';
import type { ListarBitacora } from './bitacora.schemas.js';

export async function listar(req: Request, res: Response) {
  res.json(await service.listar(req.query as unknown as ListarBitacora));
}

export async function filtros(_req: Request, res: Response) {
  res.json(await service.filtros());
}
