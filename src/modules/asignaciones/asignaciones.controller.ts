import type { Request, Response } from 'express';
import * as service from './asignaciones.service.js';

export async function listar(_req: Request, res: Response) {
  res.json(await service.listar());
}
