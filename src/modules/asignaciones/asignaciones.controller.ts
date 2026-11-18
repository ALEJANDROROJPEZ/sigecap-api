import type { Request, Response } from 'express';
import * as service from './asignaciones.service.js';
import { registrarBitacora } from '../../middlewares/bitacora.js';
import type { ListarAsignaciones } from './asignaciones.schemas.js';

export async function listar(req: Request, res: Response) {
  res.json(await service.listar(req.query as unknown as ListarAsignaciones));
}

export async function obtener(req: Request, res: Response) {
  res.json(await service.obtener(Number(req.params.id)));
}

export async function crear(req: Request, res: Response) {
  const resultado = await service.crear(req.body, req.usuario!.id);
  for (const a of resultado.asignaciones) {
    await registrarBitacora(req, {
      accion: 'CREAR', entidad: 'asignacion', idEntidad: a.id,
      despues: { idCurso: a.idCurso, idSede: a.idSede, esGeneral: a.esGeneral, correo: req.body.enviarCorreo },
    });
  }
  res.status(201).json(resultado);
}

export async function cambiarEstado(req: Request, res: Response) {
  const id = Number(req.params.id);
  const asignacion = await service.cambiarEstado(id, req.body.activo);
  await registrarBitacora(req, { accion: req.body.activo ? 'REACTIVAR' : 'DESACTIVAR', entidad: 'asignacion', idEntidad: id });
  res.json(asignacion);
}

export async function enviarCorreo(req: Request, res: Response) {
  const id = Number(req.params.id);
  const envio = await service.enviarCorreo(id);
  await registrarBitacora(req, {
    accion: 'ENVIAR_CORREO', entidad: 'asignacion', idEntidad: id, despues: { idEnvio: envio.id, destinatarios: envio.totalDestinatarios },
  });
  res.status(202).json(envio);
}
