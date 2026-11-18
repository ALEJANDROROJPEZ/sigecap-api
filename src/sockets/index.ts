import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { UsuarioToken } from '../shared/types.js';

let io: Server | null = null;

export function iniciarSockets(httpServer: HttpServer) {
  io = new Server(httpServer, { cors: { origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()) } });
  io.use((socket, next) => {
    try {
      const datos = jwt.verify(String(socket.handshake.auth?.token ?? ''), env.JWT_SECRET) as UsuarioToken & { tipo?: string };
      if (datos.tipo === 'refresh') throw new Error('token de renovación');
      socket.data.usuario = datos;
      next();
    } catch {
      next(new Error('No autorizado'));
    }
  });
  io.on('connection', (socket) => {
    const u = socket.data.usuario as UsuarioToken;
    socket.join(`usuario:${u.id}`);
    if (u.rol === 'ADMINISTRADOR') socket.join('administradores');
  });
  return io;
}

// Envía un evento en tiempo real a un usuario (por ejemplo, 'notificacion:nueva')
export function emitirAUsuario(idUsuario: number, evento: string, datos: unknown) {
  io?.to(`usuario:${idUsuario}`).emit(evento, datos);
}

// Envía un evento a todos los administradores conectados
export function emitirAAdministradores(evento: string, datos: unknown) {
  io?.to('administradores').emit(evento, datos);
}
