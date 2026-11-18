import type { Request, Response } from 'express';
import * as service from './notificaciones.service.js';

export async function listar(req: Request, res: Response) {
  const q = req.query as unknown as { soloNoLeidas?: boolean; pagina: number; porPagina: number };
  res.json(await service.listar(req.usuario!.id, q.soloNoLeidas, q.pagina, q.porPagina));
}

export async function marcarLeida(req: Request, res: Response) {
  await service.marcarLeida(req.usuario!.id, Number(req.params.id));
  res.status(204).end();
}

export async function marcarTodasLeidas(req: Request, res: Response) {
  const r = await service.marcarTodasLeidas(req.usuario!.id);
  res.json({ actualizadas: r.count });
}

export async function eliminar(req: Request, res: Response) {
  await service.eliminar(req.usuario!.id, Number(req.params.id));
  res.status(204).end();
}

export async function eliminarLeidas(req: Request, res: Response) {
  const r = await service.eliminarLeidas(req.usuario!.id);
  res.json({ eliminadas: r.count });
}
