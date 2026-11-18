// Catálogos iniciales y cuenta de administrador.  Ejecutar: npm run db:seed
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/config/prisma-client/client.js';
import { PLANTILLAS } from '../src/shared/templates/index.js';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  for (const [nombre, descripcion] of [
    ['ADMINISTRADOR', 'Gestiona empleados, cursos, evidencias y reportes'],
    ['EMPLEADO', 'Consulta sus cursos y sube constancias'],
  ]) {
    await prisma.rol.upsert({ where: { nombre }, update: {}, create: { nombre, descripcion } });
  }

  const area = await prisma.area.upsert({ where: { nombre: 'Capacitación' }, update: {}, create: { nombre: 'Capacitación' } });
  const ore = await prisma.sede.upsert({
    where: { clave: 'ORE-OAX' }, update: {},
    create: { clave: 'ORE-OAX', nombre: 'Oficina de Representación Estatal Oaxaca', tipo: 'ORE' },
  });
  // Las SARE del estado y los temas del Comité de Ética se capturan desde el sistema (Catálogos)

  for (const [siglas, nombre] of [
    ['INMUJERES', 'Instituto Nacional de las Mujeres'],
    ['CONAPRED', 'Consejo Nacional para Prevenir la Discriminación'],
    ['EBG', 'Escuela del Buen Gobierno'],
  ]) {
    await prisma.dependencia.upsert({ where: { siglas }, update: { nombre }, create: { siglas, nombre } });
  }

  // Plantillas de correo: solo se crean si no existen, para conservar los cambios hechos desde el sistema
  for (const p of Object.values(PLANTILLAS)) {
    await prisma.plantillaCorreo.upsert({
      where: { nombre: p.nombre }, update: {}, create: { nombre: p.nombre, asunto: p.asunto, cuerpoHtml: p.cuerpoHtml },
    });
  }

  const e = process.env;
  if (e.ADMIN_CURP && e.ADMIN_PASSWORD) {
    const empleado = await prisma.empleado.upsert({
      where: { curp: e.ADMIN_CURP },
      update: {},
      create: {
        cupo: '000001', curp: e.ADMIN_CURP, tipoContratacion: 'ESTRUCTURA',
        nombre: e.ADMIN_NOMBRE ?? 'Administrador', apellidoPaterno: e.ADMIN_APELLIDO ?? 'Sistema',
        correoInstitucional: e.ADMIN_CORREO || null, correoRespaldo: e.ADMIN_CORREO_RESPALDO || null,
        telefono: e.ADMIN_TELEFONO || null, puesto: 'Enlace de Capacitación', idArea: area.id, idSede: ore.id,
      },
    });
    const rolAdmin = await prisma.rol.findUniqueOrThrow({ where: { nombre: 'ADMINISTRADOR' } });
    await prisma.usuario.upsert({
      where: { idEmpleado: empleado.id },
      update: {},
      create: { idEmpleado: empleado.id, idRol: rolAdmin.id, contrasenaHash: await bcrypt.hash(e.ADMIN_PASSWORD, 12) },
    });
    console.log(`Administrador listo: ${e.ADMIN_CORREO ?? e.ADMIN_CURP}`);
  }
}

main()
  .then(() => console.log('Semilla aplicada.'))
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
