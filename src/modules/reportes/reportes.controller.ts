import type { Request, Response } from 'express';
import * as service from './reportes.service.js';

export async function listar(_req: Request, res: Response) {
  res.json(await service.listar());
}
