import { z } from 'zod';
import { CONTRASENA, TELEFONO, opcional } from '../../shared/validaciones.js';

export const loginSchema = z.object({
  // Correo institucional o CURP (para el personal sin correo institucional)
  identificador: z.string().trim().min(5).max(120),
  contrasena: z.string().min(1).max(72),
});
export const refreshSchema = z.object({ refreshToken: z.string().min(10) });
export const olvideSchema = z.object({ identificador: z.string().trim().min(5).max(120) });
export const restablecerSchema = z.object({ token: z.string().min(20).max(200), contrasena: CONTRASENA });
export const cambiarContrasenaSchema = z.object({ actual: z.string().min(1).max(72), nueva: CONTRASENA });
export const preferenciasSchema = z.object({ tema: z.enum(['CLARO', 'OSCURO']) });
export const contactoSchema = z.object({
  correoRespaldo: opcional(z.email('Correo de respaldo inválido').toLowerCase().max(120)),
  telefono: opcional(TELEFONO),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ContactoInput = z.infer<typeof contactoSchema>;
