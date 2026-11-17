// Importación masiva de empleados desde Excel (RF04): agrega los nuevos y actualiza los existentes por CUPO.
// Primero se devuelve una vista previa con los errores; los cambios solo se aplican con confirmar=true.
import ExcelJS from 'exceljs';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { HttpError } from '../../shared/http-error.js';
import { sincronizarEmpleado } from '../asignaciones/asignaciones.service.js';
import { filaImportacionSchema, type FilaImportacion } from './empleados.schemas.js';

type Campo = keyof FilaImportacion;

export const COLUMNAS: { campo: Campo; titulo: string; ejemplo: string; alias: string[] }[] = [
  { campo: 'cupo', titulo: 'CUPO', ejemplo: '012345', alias: ['CUPO', 'CLAVECUPO'] },
  { campo: 'curp', titulo: 'CURP', ejemplo: 'XEXX010101HOCXXX09', alias: ['CURP'] },
  { campo: 'numTrabajadorRusp', titulo: 'NUM. TRABAJADOR O RUSP', ejemplo: '', alias: ['RUSP', 'NUMTRABAJADOR', 'NUMTRABAJADORORUSP', 'NUMERODETRABAJADOR', 'NUMERODETRABAJADORORUSP', 'NUMTRABAJADORRUSP'] },
  { campo: 'tipoContratacion', titulo: 'TIPO DE CONTRATACIÓN', ejemplo: 'ESTRUCTURA', alias: ['TIPODECONTRATACION', 'TIPOCONTRATACION', 'CONTRATACION'] },
  { campo: 'nombre', titulo: 'NOMBRE(S)', ejemplo: 'María', alias: ['NOMBRE', 'NOMBRES'] },
  { campo: 'apellidoPaterno', titulo: 'PRIMER APELLIDO', ejemplo: 'López', alias: ['PRIMERAPELLIDO', 'APELLIDOPATERNO', 'APELLIDO1'] },
  { campo: 'apellidoMaterno', titulo: 'SEGUNDO APELLIDO', ejemplo: 'Hernández', alias: ['SEGUNDOAPELLIDO', 'APELLIDOMATERNO', 'APELLIDO2'] },
  { campo: 'correoInstitucional', titulo: 'CORREO INSTITUCIONAL', ejemplo: 'maria.lopez@becasbenitojuarez.gob.mx', alias: ['CORREOINSTITUCIONAL', 'CORREO', 'EMAIL'] },
  { campo: 'correoRespaldo', titulo: 'CORREO DE RESPALDO', ejemplo: 'maria@ejemplo.com', alias: ['CORREODERESPALDO', 'CORREORESPALDO', 'CORREOPERSONAL'] },
  { campo: 'telefono', titulo: 'TELÉFONO', ejemplo: '9511234567', alias: ['TELEFONO', 'CELULAR'] },
  { campo: 'puesto', titulo: 'PUESTO', ejemplo: 'Jefa de Atención Operativa', alias: ['PUESTO'] },
  { campo: 'area', titulo: 'ÁREA', ejemplo: 'Capacitación', alias: ['AREA'] },
  { campo: 'sede', titulo: 'SEDE (CLAVE)', ejemplo: 'ORE-OAX', alias: ['SEDECLAVE', 'SEDE', 'CLAVESEDE', 'ORESARE', 'CLAVEDESEDE'] },
];

const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');

function limpiar(campo: Campo, texto: string) {
  let v = texto.trim();
  if (campo === 'cupo' && /^\d{1,5}$/.test(v)) v = v.padStart(6, '0');          // Excel quita los ceros iniciales
  if (campo === 'telefono') v = v.replace(/\D/g, '');
  if (campo === 'tipoContratacion') {
    const t = normalizar(v);
    v = t.startsWith('E') ? 'ESTRUCTURA' : t.startsWith('H') ? 'HONORARIOS' : v;
  }
  return v;
}

export interface ResultadoImportacion {
  total: number;
  validas: number;
  nuevos: number;
  actualizaciones: number;
  areasNuevas: string[];
  errores: { fila: number; cupo: string; nombre: string; mensajes: string[] }[];
  aplicado: boolean;
}

export async function importar(buffer: Buffer, confirmar: boolean): Promise<ResultadoImportacion & { idsNuevos: number[] }> {
  const libro = new ExcelJS.Workbook();
  try {
    await libro.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    throw new HttpError(400, 'No se pudo leer el archivo. Verifica que sea un libro de Excel (.xlsx) válido.');
  }
  const hoja = libro.worksheets[0];
  if (!hoja || hoja.rowCount < 2) throw new HttpError(400, 'El archivo no contiene registros');

  // 1. Encabezados: se localizan por nombre, sin importar el orden, mayúsculas o acentos
  const columnas = new Map<Campo, number>();
  hoja.getRow(1).eachCell((celda, n) => {
    const titulo = normalizar(celda.text ?? '');
    const col = COLUMNAS.find((c) => c.alias.includes(titulo));
    if (col && !columnas.has(col.campo)) columnas.set(col.campo, n);
  });
  const obligatorias: Campo[] = ['cupo', 'curp', 'tipoContratacion', 'nombre', 'apellidoPaterno', 'puesto', 'area', 'sede'];
  const faltantes = obligatorias.filter((c) => !columnas.has(c));
  if (faltantes.length > 0) {
    const nombres = faltantes.map((c) => COLUMNAS.find((x) => x.campo === c)!.titulo).join(', ');
    throw new HttpError(400, `Faltan columnas en el archivo: ${nombres}. Descarga la plantilla para ver el formato.`);
  }

  // 2. Lectura y validación de cada fila
  const [sedes, areas, existentes] = await Promise.all([
    prisma.sede.findMany(),
    prisma.area.findMany(),
    prisma.empleado.findMany({ select: { id: true, cupo: true, curp: true, correoInstitucional: true } }),
  ]);
  const sedePorClave = new Map(sedes.map((s) => [normalizar(s.clave), s.id]));
  const areaPorNombre = new Map(areas.map((a) => [normalizar(a.nombre), a.id]));
  const porCupo = new Map(existentes.map((e) => [e.cupo, e]));
  const porCurp = new Map(existentes.map((e) => [e.curp, e]));
  const porCorreo = new Map(existentes.filter((e) => e.correoInstitucional).map((e) => [e.correoInstitucional!, e]));

  const errores: ResultadoImportacion['errores'] = [];
  const validas: { fila: number; datos: FilaImportacion; idSede: number }[] = [];
  const vistos = { cupo: new Set<string>(), curp: new Set<string>() };
  const areasNuevas = new Map<string, string>();
  let total = 0;

  for (let n = 2; n <= hoja.rowCount; n += 1) {
    const fila = hoja.getRow(n);
    const crudo: Record<string, string> = {};
    for (const [campo, col] of columnas) crudo[campo] = limpiar(campo, fila.getCell(col).text ?? '');
    if (Object.values(crudo).every((v) => v === '')) continue;               // fila vacía
    total += 1;

    const mensajes: string[] = [];
    const r = filaImportacionSchema.safeParse(crudo);
    if (!r.success) {
      const porCampo = z.flattenError(r.error).fieldErrors as Record<string, string[] | undefined>;
      for (const [campo, lista] of Object.entries(porCampo)) {
        const titulo = COLUMNAS.find((c) => c.campo === campo)?.titulo ?? campo;
        mensajes.push(`${titulo}: ${(lista ?? []).join('; ')}`);
      }
    } else {
      const d = r.data;
      const idSede = sedePorClave.get(normalizar(d.sede));
      if (!idSede) mensajes.push(`SEDE: la clave «${d.sede}» no está registrada en el catálogo de sedes`);
      if (vistos.cupo.has(d.cupo)) mensajes.push('CUPO repetida dentro del archivo');
      if (vistos.curp.has(d.curp)) mensajes.push('CURP repetida dentro del archivo');
      const mismaCurp = porCurp.get(d.curp);
      if (mismaCurp && mismaCurp.cupo !== d.cupo) mensajes.push(`CURP ya registrada con la CUPO ${mismaCurp.cupo}`);
      const mismoCorreo = d.correoInstitucional ? porCorreo.get(d.correoInstitucional) : undefined;
      if (mismoCorreo && mismoCorreo.cupo !== d.cupo) mensajes.push(`Correo institucional ya registrado con la CUPO ${mismoCorreo.cupo}`);
      vistos.cupo.add(d.cupo);
      vistos.curp.add(d.curp);
      if (mensajes.length === 0 && idSede) {
        validas.push({ fila: n, datos: d, idSede });
        if (!areaPorNombre.has(normalizar(d.area))) areasNuevas.set(normalizar(d.area), d.area);
      }
    }
    if (mensajes.length > 0) {
      errores.push({
        fila: n, cupo: crudo.cupo ?? '',
        nombre: [crudo.nombre, crudo.apellidoPaterno, crudo.apellidoMaterno].filter(Boolean).join(' '), mensajes,
      });
    }
  }
  if (total === 0) throw new HttpError(400, 'El archivo no contiene registros');

  const resumen = {
    total,
    validas: validas.length,
    nuevos: validas.filter((v) => !porCupo.has(v.datos.cupo)).length,
    actualizaciones: validas.filter((v) => porCupo.has(v.datos.cupo)).length,
    areasNuevas: [...areasNuevas.values()],
    errores,
  };
  if (!confirmar) return { ...resumen, aplicado: false, idsNuevos: [] };

  // 3. Aplicación: se crean las áreas que falten y se guardan solo las filas válidas
  for (const [clave, nombre] of areasNuevas) {
    const area = await prisma.area.upsert({ where: { nombre }, update: {}, create: { nombre } });
    areaPorNombre.set(clave, area.id);
  }
  const idsNuevos: number[] = [];
  let nuevos = 0;
  let actualizaciones = 0;
  for (const { fila, datos, idSede } of validas) {
    const { area, sede: _sede, ...resto } = datos;
    const data = { ...resto, idSede, idArea: areaPorNombre.get(normalizar(area))! };
    try {
      if (porCupo.has(datos.cupo)) {
        await prisma.empleado.update({ where: { cupo: datos.cupo }, data });
        actualizaciones += 1;
      } else {
        const creado = await prisma.empleado.create({ data });
        idsNuevos.push(creado.id);
        nuevos += 1;
      }
    } catch (err) {
      errores.push({ fila, cupo: datos.cupo, nombre: `${datos.nombre} ${datos.apellidoPaterno}`, mensajes: [`No se pudo guardar: ${(err as Error).message.split('\n').pop()}`] });
    }
  }
  for (const id of idsNuevos) await sincronizarEmpleado(id);
  return { ...resumen, validas: nuevos + actualizaciones, nuevos, actualizaciones, errores, aplicado: true, idsNuevos };
}

// Plantilla de Excel con los encabezados esperados y una fila de ejemplo
export async function plantilla() {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet('Empleados');
  hoja.columns = COLUMNAS.map((c) => ({ header: c.titulo, key: c.campo, width: Math.max(18, c.titulo.length + 4) }));
  hoja.addRow(Object.fromEntries(COLUMNAS.map((c) => [c.campo, c.ejemplo])));
  const encabezado = hoja.getRow(1);
  encabezado.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  encabezado.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF611232' } };
  hoja.getColumn('cupo').numFmt = '@';
  hoja.getColumn('telefono').numFmt = '@';
  const notas = libro.addWorksheet('Instrucciones');
  notas.getColumn(1).width = 110;
  [
    'Captura un empleado por fila en la hoja «Empleados». La fila 2 es un ejemplo: reemplázala.',
    'CUPO: 6 dígitos. Si la CUPO ya existe en el sistema, el registro se actualiza; si no existe, se da de alta.',
    'CURP: 18 caracteres, obligatoria para todo el personal (estructura y honorarios).',
    'TIPO DE CONTRATACIÓN: ESTRUCTURA u HONORARIOS.',
    'CORREO INSTITUCIONAL: opcional. Si se captura, el correo de respaldo y el teléfono (10 dígitos) son obligatorios.',
    'SEDE (CLAVE): debe coincidir con una clave del catálogo de sedes (por ejemplo, ORE-OAX).',
    'ÁREA: si no existe en el catálogo, se crea al confirmar la importación.',
  ].forEach((t) => notas.addRow([t]));
  return Buffer.from(await libro.xlsx.writeBuffer());
}
