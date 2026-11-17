import type { Request, Response } from 'express';
import * as service from './auth.service.js';
import { registrarBitacora } from '../../middlewares/bitacora.js';
import { HttpError } from '../../shared/http-error.js';
import { limpiarIntentos, registrarFallo, verificarIntentos } from '../../middlewares/rate-limit.js';

export async function login(req: Request, res: Response) {
  const clave = `${req.ip}|${String(req.body.identificador).toLowerCase()}`;
  verificarIntentos(clave);
  try {
    const resultado = await service.login(req.body);
    limpiarIntentos(clave);
    req.usuario = { id: resultado.usuario.id, idEmpleado: resultado.usuario.idEmpleado, rol: resultado.usuario.rol };
    await registrarBitacora(req, { accion: 'LOGIN', entidad: 'usuario', idEntidad: resultado.usuario.id });
    res.json(resultado);
  } catch (err) {
    if (err instanceof HttpError && err.status === 401) registrarFallo(clave);
    throw err;
  }
}

export async function refrescar(req: Request, res: Response) {
  res.json(await service.refrescar(req.body.refreshToken));
}

export async function olvide(req: Request, res: Response) {
  const idUsuario = await service.solicitarRecuperacion(req.body.identificador);
  if (idUsuario) await registrarBitacora(req, { accion: 'SOLICITAR_RECUPERACION', entidad: 'usuario', idEntidad: idUsuario });
  res.json({ mensaje: 'Si la cuenta existe y tiene un correo registrado, recibirás un enlace para restablecer tu contraseña.' });
}

export async function restablecer(req: Request, res: Response) {
  const idUsuario = await service.restablecer(req.body.token, req.body.contrasena);
  await registrarBitacora(req, { accion: 'RESTABLECER_CONTRASENA', entidad: 'usuario', idEntidad: idUsuario });
  res.json({ mensaje: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
}

export async function perfil(req: Request, res: Response) {
  res.json(await service.perfil(req.usuario!.id));
}

export async function cambiarContrasena(req: Request, res: Response) {
  await service.cambiarContrasena(req.usuario!.id, req.body.actual, req.body.nueva);
  await registrarBitacora(req, { accion: 'CAMBIAR_CONTRASENA', entidad: 'usuario', idEntidad: req.usuario!.id });
  res.status(204).end();
}

export async function actualizarPreferencias(req: Request, res: Response) {
  res.json(await service.actualizarPreferencias(req.usuario!.id, req.body.tema));
}

export async function actualizarContacto(req: Request, res: Response) {
  const { antes, perfil } = await service.actualizarContacto(req.usuario!, req.body);
  await registrarBitacora(req, {
    accion: 'ACTUALIZAR_CONTACTO', entidad: 'empleado', idEntidad: req.usuario!.idEmpleado,
    antes, despues: { correoRespaldo: perfil.correoRespaldo, telefono: perfil.telefono },
  });
  res.json(perfil);
}
