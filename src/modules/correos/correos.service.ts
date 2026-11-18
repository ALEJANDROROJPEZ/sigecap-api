import { prisma } from '../../config/prisma.js';
import { enviarCorreo, mailer } from '../../config/mailer.js';
import { HttpError } from '../../shared/http-error.js';
import { saltar } from '../../shared/validaciones.js';
import { PLANTILLAS, renderizar, type NombrePlantilla } from '../../shared/templates/index.js';
import type { ActualizarPlantilla } from './correos.schemas.js';

// Devuelve la plantilla guardada; si aún no existe en la base de datos, la crea con el texto predeterminado
export async function obtenerPlantilla(nombre: NombrePlantilla) {
  const base = PLANTILLAS[nombre];
  return prisma.plantillaCorreo.upsert({
    where: { nombre },
    update: {},
    create: { nombre: base.nombre, asunto: base.asunto, cuerpoHtml: base.cuerpoHtml },
  });
}

export async function listarPlantillas() {
  for (const nombre of Object.keys(PLANTILLAS) as NombrePlantilla[]) await obtenerPlantilla(nombre);
  const plantillas = await prisma.plantillaCorreo.findMany({ orderBy: { nombre: 'asc' } });
  return plantillas.map((p) => ({ ...p, variables: PLANTILLAS[p.nombre as NombrePlantilla]?.variables ?? [] }));
}

export const actualizarPlantilla = (id: number, data: ActualizarPlantilla) =>
  prisma.plantillaCorreo.update({ where: { id }, data });

export async function restaurarPlantilla(id: number) {
  const actual = await prisma.plantillaCorreo.findUniqueOrThrow({ where: { id } });
  const base = PLANTILLAS[actual.nombre as NombrePlantilla];
  if (!base) throw new HttpError(400, 'Esta plantilla no tiene un texto predeterminado');
  return prisma.plantillaCorreo.update({ where: { id }, data: { asunto: base.asunto, cuerpoHtml: base.cuerpoHtml } });
}

export interface Destinatario {
  correo: string | string[];
  variables: Record<string, string | null | undefined>;
}

// Envía un correo a cada destinatario con la plantilla indicada. Nunca lanza error:
// devuelve cuántos se enviaron y cuántos fallaron para que la operación principal no se interrumpa.
export async function enviarConPlantilla(nombre: NombrePlantilla, destinatarios: Destinatario[]) {
  let enviados = 0;
  let fallidos = 0;
  if (destinatarios.length === 0) return { enviados, fallidos };
  const plantilla = await obtenerPlantilla(nombre);
  for (const d of destinatarios) {
    try {
      await enviarCorreo(d.correo, renderizar(plantilla.asunto, d.variables, false), renderizar(plantilla.cuerpoHtml, d.variables));
      enviados += 1;
    } catch (err) {
      fallidos += 1;
      console.error(`No se pudo enviar el correo «${nombre}»:`, (err as Error).message);
    }
  }
  return { enviados, fallidos };
}

export async function listarEnvios(pagina: number, porPagina: number) {
  const [total, datos] = await Promise.all([
    prisma.envioCorreo.count(),
    prisma.envioCorreo.findMany({
      include: {
        plantilla: { select: { nombre: true } },
        asignacion: { select: { id: true, esGeneral: true, curso: { select: { nombre: true } }, sede: { select: { clave: true } } } },
      },
      orderBy: { fechaEnvio: 'desc' },
      ...saltar(pagina, porPagina),
    }),
  ]);
  return { total, pagina, porPagina, datos };
}

// Comprueba la conexión SMTP y envía un mensaje de prueba
export async function probar(para: string) {
  try {
    await mailer.verify();
    await enviarCorreo(para, 'Prueba de correo de SIGECAP', '<p>La configuración de correo de SIGECAP funciona correctamente.</p>');
    return { ok: true, mensaje: `Correo de prueba enviado a ${para}` };
  } catch (err) {
    return { ok: false, mensaje: `No se pudo enviar: ${(err as Error).message}` };
  }
}
