import type { Request, Response } from 'express';
import * as service from './evidencias.service.js';
import { subirEvidenciaSchema, type ListarEvidencias } from './evidencias.schemas.js';
import { registrarBitacora } from '../../middlewares/bitacora.js';
import { HttpError } from '../../shared/http-error.js';

export async function subir(req: Request, res: Response) {
  if (!req.file) throw new HttpError(400, 'Adjunta la constancia en PDF en el campo «archivo»');
  // Los campos del formulario llegan después de procesar el archivo, por eso se validan aquí
  const datos = subirEvidenciaSchema.parse(req.body);
  const evidencia = await service.subir(req.usuario!, datos, req.file);
  await registrarBitacora(req, {
    accion: 'SUBIR', entidad: 'evidencia', idEntidad: evidencia.id,
    despues: { idCursoEmpleado: evidencia.idCursoEmpleado, archivo: evidencia.nombreArchivo, bytes: evidencia.tamanoBytes },
  });
  res.status(201).json(evidencia);
}

export async function listar(req: Request, res: Response) {
  res.json(await service.listar(req.query as unknown as ListarEvidencias));
}

export async function obtener(req: Request, res: Response) {
  res.json(await service.obtener(Number(req.params.id), req.usuario!));
}

export async function archivo(req: Request, res: Response) {
  const { absoluta, nombre } = await service.rutaArchivo(Number(req.params.id), req.usuario!);
  res.type('application/pdf');
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(nombre)}`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.sendFile(absoluta);
}

export async function dictaminar(req: Request, res: Response) {
  const id = Number(req.params.id);
  const evidencia = await service.dictaminar(id, req.body, req.usuario!);
  await registrarBitacora(req, {
    accion: req.body.estado === 'APROBADA' ? 'APROBAR' : 'RECHAZAR', entidad: 'evidencia', idEntidad: id,
    antes: { estado: 'EN_REVISION' }, despues: { estado: evidencia.estado, comentario: evidencia.comentarioRevision },
  });
  res.json(evidencia);
}
