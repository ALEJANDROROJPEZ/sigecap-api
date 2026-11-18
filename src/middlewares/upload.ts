import multer from 'multer';
import { env } from '../config/env.js';
import { HttpError } from '../shared/http-error.js';

const MB = 1024 * 1024;

// Constancias: un PDF de hasta MAX_UPLOAD_MB (se valida el contenido real en el servicio)
export const subirPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_MB * MB, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') return cb(new HttpError(400, 'Solo se aceptan archivos PDF'));
    cb(null, true);
  },
}).single('archivo');

// Importación de empleados: un archivo .xlsx de hasta 10 MB
export const subirExcel = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * MB, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!/\.xlsx$/i.test(file.originalname)) return cb(new HttpError(400, 'Solo se aceptan archivos de Excel (.xlsx)'));
    cb(null, true);
  },
}).single('archivo');

// Verifica la firma del archivo: todo PDF inicia con «%PDF-»
export const esPdf = (buffer: Buffer) => buffer.subarray(0, 5).toString('latin1') === '%PDF-';
