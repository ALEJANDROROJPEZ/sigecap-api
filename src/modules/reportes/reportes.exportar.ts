// Generación de archivos de los reportes (RF13): formatos institucionales en Excel y listados en Excel, PDF y CSV
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { prisma } from '../../config/prisma.js';
import { fechaCorta, fechaLocalISO } from '../../shared/validaciones.js';
import * as service from './reportes.service.js';
import type { Exportar, Filtros } from './reportes.schemas.js';

const GUINDA = 'FF611232';
const DORADO = 'FFDDC9A3';
const MIME = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
  csv: 'text/csv; charset=utf-8',
} as const;
const ESTADOS: Record<string, string> = {
  PENDIENTE: 'Pendiente', EN_REVISION: 'En revisión', COMPLETADO: 'Completado', RECHAZADO: 'Rechazado',
};

type Celda = string | number | Date | null;
interface Tabla { titulo: string; subtitulo: string; columnas: { titulo: string; ancho: number }[]; filas: Celda[][] }

const borde = { style: 'thin' as const, color: { argb: 'FFBFBFBF' } };
const bordes = { top: borde, left: borde, bottom: borde, right: borde };

function estiloEncabezado(celda: ExcelJS.Cell, fondo = GUINDA, texto = 'FFFFFFFF') {
  celda.font = { bold: true, color: { argb: texto }, size: 10 };
  celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fondo } };
  celda.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  celda.border = bordes;
}

// Texto que describe los filtros aplicados; aparece como subtítulo en todos los reportes
async function describirFiltros(f: Filtros) {
  const partes: string[] = [];
  if (f.anio) partes.push(f.trimestre ? `Trimestre ${f.anio}-${service.ROMANOS[f.trimestre]}` : `Año ${f.anio}`);
  else if (f.trimestre) partes.push(`Trimestre ${service.ROMANOS[f.trimestre]}`);
  if (f.idDependencia) partes.push((await prisma.dependencia.findUnique({ where: { id: f.idDependencia } }))?.siglas ?? '');
  if (f.idSede) partes.push(`Sede ${(await prisma.sede.findUnique({ where: { id: f.idSede } }))?.clave ?? ''}`);
  return `${partes.length ? partes.join(' · ') : 'Todos los registros'} · Generado el ${new Date().toLocaleDateString('es-MX')}`;
}

// ---------- Listados genéricos ----------

async function tablaXlsx(t: Tabla) {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'SIGECAP';
  const hoja = libro.addWorksheet('Reporte', { views: [{ state: 'frozen', ySplit: 4 }] });
  hoja.mergeCells(1, 1, 1, t.columnas.length);
  hoja.getCell(1, 1).value = t.titulo;
  hoja.getCell(1, 1).font = { bold: true, size: 14, color: { argb: GUINDA } };
  hoja.mergeCells(2, 1, 2, t.columnas.length);
  hoja.getCell(2, 1).value = t.subtitulo;
  hoja.getCell(2, 1).font = { size: 10, color: { argb: 'FF595959' } };
  t.columnas.forEach((c, i) => {
    hoja.getColumn(i + 1).width = c.ancho;
    const celda = hoja.getCell(4, i + 1);
    celda.value = c.titulo;
    estiloEncabezado(celda);
  });
  hoja.getRow(4).height = 28;
  for (const fila of t.filas) {
    const r = hoja.addRow(fila);
    r.eachCell({ includeEmpty: true }, (c) => {
      c.border = bordes;
      c.alignment = { vertical: 'top', wrapText: true };
      if (c.value instanceof Date) c.numFmt = 'dd/mm/yyyy';
    });
  }
  hoja.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: t.columnas.length } };
  return Buffer.from(await libro.xlsx.writeBuffer());
}

const textoCelda = (v: Celda) => (v instanceof Date ? fechaCorta(v) : v === null ? '' : String(v));

function tablaCsv(t: Tabla) {
  const escapar = (v: Celda) => {
    const s = textoCelda(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lineas = [t.columnas.map((c) => escapar(c.titulo)).join(','), ...t.filas.map((f) => f.map(escapar).join(','))];
  return Buffer.from(`﻿${lineas.join('\r\n')}\r\n`, 'utf8');   // BOM para que Excel reconozca los acentos
}

function tablaPdf(t: Tabla) {
  const doc = new PDFDocument({ size: 'LETTER', layout: 'landscape', margin: 36, bufferPages: true });
  const partes: Buffer[] = [];
  doc.on('data', (p: Buffer) => partes.push(p));
  const fin = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(partes))));

  const x0 = doc.page.margins.left;
  const anchoUtil = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const suma = t.columnas.reduce((s, c) => s + c.ancho, 0);
  const anchos = t.columnas.map((c) => (c.ancho / suma) * anchoUtil);
  const limite = doc.page.height - doc.page.margins.bottom - 18;
  const RELLENO = 4;

  const encabezadoTabla = () => {
    const y = doc.y;
    doc.font('Helvetica-Bold').fontSize(8);
    const alto = Math.max(...t.columnas.map((c, i) => doc.heightOfString(c.titulo, { width: anchos[i]! - RELLENO * 2 }))) + RELLENO * 2;
    doc.rect(x0, y, anchoUtil, alto).fill('#611232');
    let x = x0;
    doc.fillColor('#ffffff');
    t.columnas.forEach((c, i) => {
      doc.text(c.titulo, x + RELLENO, y + RELLENO, { width: anchos[i]! - RELLENO * 2 });
      x += anchos[i]!;
    });
    doc.fillColor('#1f2937').font('Helvetica').fontSize(8);
    doc.y = y + alto;
  };

  doc.font('Helvetica-Bold').fontSize(14).fillColor('#611232').text(t.titulo, x0, doc.page.margins.top);
  doc.font('Helvetica').fontSize(9).fillColor('#4b5563').text(t.subtitulo);
  doc.moveDown(0.8);
  encabezadoTabla();

  t.filas.forEach((fila, n) => {
    const textos = fila.map(textoCelda);
    const alto = Math.max(...textos.map((s, i) => doc.heightOfString(s || ' ', { width: anchos[i]! - RELLENO * 2 }))) + RELLENO * 2;
    if (doc.y + alto > limite) {
      doc.addPage();
      doc.y = doc.page.margins.top;
      encabezadoTabla();
    }
    const y = doc.y;
    if (n % 2 === 1) doc.rect(x0, y, anchoUtil, alto).fill('#f5efe6');
    doc.fillColor('#1f2937');
    let x = x0;
    textos.forEach((s, i) => {
      doc.text(s, x + RELLENO, y + RELLENO, { width: anchos[i]! - RELLENO * 2 });
      x += anchos[i]!;
    });
    doc.moveTo(x0, y + alto).lineTo(x0 + anchoUtil, y + alto).strokeColor('#d1d5db').lineWidth(0.5).stroke();
    doc.y = y + alto;
  });
  if (t.filas.length === 0) doc.moveDown().fillColor('#6b7280').text('No hay registros con los filtros seleccionados.', x0);

  const paginas = doc.bufferedPageRange();
  for (let i = 0; i < paginas.count; i += 1) {
    doc.switchToPage(paginas.start + i);
    doc.font('Helvetica').fontSize(8).fillColor('#6b7280')
      .text(`SIGECAP · CNBBBJ Oaxaca · Página ${i + 1} de ${paginas.count}`, x0, doc.page.height - doc.page.margins.bottom - 8,
        { width: anchoUtil, align: 'right', lineBreak: false });
  }
  doc.end();
  return fin;
}

const renderizar = (t: Tabla, formato: 'xlsx' | 'pdf' | 'csv') =>
  formato === 'xlsx' ? tablaXlsx(t) : formato === 'csv' ? Promise.resolve(tablaCsv(t)) : tablaPdf(t);

// ---------- Concentrado de constancias ----------
// Un renglón por servidor público y una columna por curso (agrupadas por dependencia). Cada celda
// lleva la fecha de la constancia aprobada, «NO APLICA» según el tipo de contratación o «Falta Curso».

async function concentradoXlsx(f: Filtros, subtitulo: string) {
  const { cursos, empleados, constancias } = await service.concentrado(f);
  const libro = new ExcelJS.Workbook();
  libro.creator = 'SIGECAP';
  const FIJAS = ['No.', 'CUPO', 'NOMBRE', 'PUESTO', 'SEDE', 'TIPO DE CONTRATACIÓN', 'ESTATUS'];
  const ANCHOS = [6, 10, 38, 34, 12, 16, 11];
  const colCurso = (i: number) => FIJAS.length + 1 + i;
  const colTotal = FIJAS.length + cursos.length + 1;
  const aplica = (c: (typeof cursos)[number], e: (typeof empleados)[number]) =>
    (e.tipoContratacion === 'ESTRUCTURA' ? c.aplicaEstructura : c.aplicaHonorarios);

  const armar = (nombre: string, titulo: string, digital: boolean) => {
    const hoja = libro.addWorksheet(nombre, { views: [{ state: 'frozen', xSplit: 3, ySplit: 5 }] });
    hoja.getCell(1, 1).value = titulo;
    hoja.getCell(1, 1).font = { bold: true, size: 14, color: { argb: GUINDA } };
    hoja.getCell(2, 1).value = subtitulo;
    hoja.getCell(2, 1).font = { size: 10, color: { argb: 'FF595959' } };

    FIJAS.forEach((t, i) => {
      hoja.getColumn(i + 1).width = ANCHOS[i]!;
      hoja.mergeCells(4, i + 1, 5, i + 1);
      hoja.getCell(4, i + 1).value = t;
      estiloEncabezado(hoja.getCell(4, i + 1));
    });
    // Fila 4: dependencia (celdas combinadas); fila 5: nombre de cada curso
    let inicio = 0;
    while (inicio < cursos.length) {
      let finGrupo = inicio;
      while (finGrupo + 1 < cursos.length && cursos[finGrupo + 1]!.idDependencia === cursos[inicio]!.idDependencia) finGrupo += 1;
      if (finGrupo > inicio) hoja.mergeCells(4, colCurso(inicio), 4, colCurso(finGrupo));
      hoja.getCell(4, colCurso(inicio)).value = cursos[inicio]!.dependencia.siglas;
      for (let i = inicio; i <= finGrupo; i += 1) estiloEncabezado(hoja.getCell(4, colCurso(i)));
      inicio = finGrupo + 1;
    }
    cursos.forEach((c, i) => {
      hoja.getColumn(colCurso(i)).width = 18;
      hoja.getCell(5, colCurso(i)).value = c.nombreCorto ?? c.nombre;
      estiloEncabezado(hoja.getCell(5, colCurso(i)), DORADO, 'FF1F2937');
    });
    const finales = digital ? ['TOTAL DE EVIDENCIAS'] : ['CURSOS ACREDITADOS', 'CURSOS FALTANTES'];
    finales.forEach((t, i) => {
      hoja.getColumn(colTotal + i).width = 14;
      hoja.mergeCells(4, colTotal + i, 5, colTotal + i);
      hoja.getCell(4, colTotal + i).value = t;
      estiloEncabezado(hoja.getCell(4, colTotal + i));
    });
    hoja.getRow(5).height = 60;

    const totalesCurso = cursos.map(() => 0);
    empleados.forEach((e, n) => {
      const fila: Celda[] = [n + 1, e.cupo, e.nombreReporte, e.puesto, e.sede.clave, e.tipoContratacion === 'ESTRUCTURA' ? 'Estructura' : 'Honorarios', 'Activo'];
      let acreditados = 0;
      let faltan = 0;
      cursos.forEach((c, i) => {
        const fecha = constancias.get(`${e.id}-${c.id}`);
        if (fecha) { acreditados += 1; totalesCurso[i]! += 1; fila.push(digital ? 1 : fecha); }
        else if (!aplica(c, e)) fila.push(digital ? 0 : 'NO APLICA');
        else { faltan += 1; fila.push(digital ? 0 : 'Falta Curso'); }
      });
      fila.push(acreditados);
      if (!digital) fila.push(faltan);
      const r = hoja.addRow(fila);
      r.eachCell({ includeEmpty: true }, (celda, col) => {
        celda.border = bordes;
        celda.alignment = { vertical: 'middle', horizontal: col === 3 || col === 4 ? 'left' : 'center', wrapText: col === 4 };
        if (celda.value instanceof Date) celda.numFmt = 'dd/mm/yyyy';
        if (celda.value === 'Falta Curso') celda.font = { color: { argb: 'FFB91C1C' } };
        if (celda.value === 'NO APLICA') celda.font = { color: { argb: 'FF6B7280' } };
      });
    });
    const totales: Celda[] = ['', '', digital ? 'TOTAL DE EVIDENCIAS POR CURSO' : 'TOTAL DE CONSTANCIAS POR CURSO', '', '', '', '', ...totalesCurso, totalesCurso.reduce((s, v) => s + v, 0)];
    hoja.addRow(totales).eachCell({ includeEmpty: true }, (celda) => {
      celda.font = { bold: true };
      celda.border = bordes;
      celda.alignment = { horizontal: 'center' };
    });
  };

  armar('Concentrado', 'CONCENTRADO DE CONSTANCIAS', false);
  armar('Evidencia digital', 'CONCENTRADO DE CONSTANCIAS · EVIDENCIA DIGITAL (1 = SÍ, 0 = NO)', true);
  return Buffer.from(await libro.xlsx.writeBuffer());
}

// ---------- Formulario trimestral del Comité de Ética ----------
// Una hoja por curso con las personas que lo acreditaron en el trimestre.

async function comiteEticaXlsx(anio: number, trimestre: number, f: Filtros, subtitulo: string) {
  const grupos = await service.comiteEtica(anio, trimestre, f);
  const libro = new ExcelJS.Workbook();
  libro.creator = 'SIGECAP';
  const periodo = `${anio}-${service.ROMANOS[trimestre]}`;
  const COLUMNAS = [
    ['Fecha de inicio', 14], ['Trimestre', 11], ['Número de trabajador o RUSP', 24], ['Nombre(s)', 24],
    ['Primer apellido', 20], ['Segundo apellido', 20], ['Tema', 34], ['Estatus de acreditación', 46],
  ] as const;
  const usados = new Set<string>();
  const nombreHoja = (base: string) => {
    const limpio = base.replace(/[\\/*?:[\]]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31) || 'Curso';
    let nombre = limpio;
    for (let n = 2; usados.has(nombre.toLowerCase()); n += 1) nombre = `${limpio.slice(0, 28)} ${n}`;
    usados.add(nombre.toLowerCase());
    return nombre;
  };

  if (grupos.length === 0) {
    const hoja = libro.addWorksheet('Sin registros');
    hoja.getColumn(1).width = 90;
    hoja.getCell(1, 1).value = `No hay constancias aprobadas en el trimestre ${periodo} con los filtros seleccionados.`;
  }
  for (const { curso, registros } of grupos) {
    const hoja = libro.addWorksheet(nombreHoja(curso.nombreCorto ?? curso.nombre), { views: [{ state: 'frozen', ySplit: 4 }] });
    hoja.mergeCells(1, 1, 1, COLUMNAS.length);
    hoja.getCell(1, 1).value = `FORMULARIO DE REGISTRO DE CAPACITACIÓN · ${curso.nombre}`;
    hoja.getCell(1, 1).font = { bold: true, size: 12, color: { argb: GUINDA } };
    hoja.mergeCells(2, 1, 2, COLUMNAS.length);
    hoja.getCell(2, 1).value = subtitulo;
    hoja.getCell(2, 1).font = { size: 10, color: { argb: 'FF595959' } };
    COLUMNAS.forEach(([titulo, ancho], i) => {
      hoja.getColumn(i + 1).width = ancho;
      hoja.getCell(4, i + 1).value = titulo;
      estiloEncabezado(hoja.getCell(4, i + 1));
    });
    const tema = curso.temaEtica ? `${curso.temaEtica.codigo} ${curso.temaEtica.descripcion}` : '';
    for (const r of registros) {
      const e = r.cursoEmpleado.empleado;
      const fila = hoja.addRow([
        r.fechaInicioCurso, periodo, e.numTrabajadorRusp ?? e.curp, e.nombre, e.apellidoPaterno, e.apellidoMaterno ?? '',
        tema, '04 Concluido (con constancia de haberlo cursado)',
      ]);
      fila.eachCell({ includeEmpty: true }, (celda) => { celda.border = bordes; });
      fila.getCell(1).numFmt = 'dd/mm/yyyy';
    }
  }
  return Buffer.from(await libro.xlsx.writeBuffer());
}

// ---------- Punto de entrada ----------

export async function exportar(e: Exportar) {
  const { tipo, formato, ...f } = e;
  const subtitulo = await describirFiltros(f);
  const hoy = fechaLocalISO();
  let contenido: Buffer;
  let nombre: string;

  if (tipo === 'concentrado') {
    contenido = await concentradoXlsx(f, subtitulo);
    nombre = `concentrado_constancias_${hoy}.xlsx`;
  } else if (tipo === 'comite-etica') {
    contenido = await comiteEticaXlsx(f.anio!, f.trimestre!, f, subtitulo);
    nombre = `formulario_comite_etica_${f.anio}-${service.ROMANOS[f.trimestre!]}.xlsx`;
  } else if (tipo === 'cumplimiento') {
    const filas = await service.cumplimiento(f);
    contenido = await renderizar({
      titulo: 'Cumplimiento de cursos de capacitación', subtitulo,
      columnas: [
        { titulo: 'CUPO', ancho: 9 }, { titulo: 'Nombre', ancho: 34 }, { titulo: 'Sede', ancho: 11 }, { titulo: 'Contratación', ancho: 14 },
        { titulo: 'Dependencia', ancho: 14 }, { titulo: 'Curso', ancho: 46 }, { titulo: 'Periodo', ancho: 10 },
        { titulo: 'Estado', ancho: 13 }, { titulo: 'Fecha de conclusión', ancho: 14 },
      ],
      filas: filas.map((r) => [
        r.cupo, r.nombre, r.sede, r.tipoContratacion === 'ESTRUCTURA' ? 'Estructura' : 'Honorarios', r.dependencia, r.curso,
        r.periodo, ESTADOS[r.estado] ?? r.estado, r.fechaConclusion,
      ]),
    }, formato);
    nombre = `cumplimiento_${hoy}.${formato}`;
  } else {
    const filas = await service.rezagados(f);
    contenido = await renderizar({
      titulo: 'Personal con cursos pendientes', subtitulo,
      columnas: [
        { titulo: 'CUPO', ancho: 9 }, { titulo: 'Nombre', ancho: 34 }, { titulo: 'Sede', ancho: 11 }, { titulo: 'Puesto', ancho: 30 },
        { titulo: 'Correo', ancho: 32 }, { titulo: 'Teléfono', ancho: 13 }, { titulo: 'Pendientes', ancho: 11 }, { titulo: 'Cursos que faltan', ancho: 60 },
      ],
      filas: filas.map((r) => [
        r.cupo, r.nombre, r.sede, r.puesto, r.correo, r.telefono, r.cursos.length,
        r.cursos.map((c) => `${c.nombre} (${c.periodo})${c.estado === 'RECHAZADO' ? ' – constancia rechazada' : ''}`).join('; '),
      ]),
    }, formato);
    nombre = `personal_con_pendientes_${hoy}.${formato}`;
  }
  return { contenido, nombre, mime: MIME[tipo === 'concentrado' || tipo === 'comite-etica' ? 'xlsx' : formato] };
}
