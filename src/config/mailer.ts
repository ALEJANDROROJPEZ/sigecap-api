import dotenv from 'dotenv';
import nodemailer, { type Transporter } from 'nodemailer';
import { env } from './env.js';

const HOSTS_EJEMPLO = new Set(['', 'localhost', 'smtp.ejemplo.gob.mx', 'ejemplo.gob.mx', 'smtp.ejemplo.com']);

const PROVEEDORES_CONOCIDOS: Record<string, { host: string; port: number }> = {
  'gmail.com': { host: 'smtp.gmail.com', port: 587 },
  'googlemail.com': { host: 'smtp.gmail.com', port: 587 },
  'outlook.com': { host: 'smtp.office365.com', port: 587 },
  'hotmail.com': { host: 'smtp.office365.com', port: 587 },
  'live.com': { host: 'smtp.office365.com', port: 587 },
  'office365.com': { host: 'smtp.office365.com', port: 587 },
  'yahoo.com': { host: 'smtp.mail.yahoo.com', port: 587 },
  'yahoo.com.mx': { host: 'smtp.mail.yahoo.com', port: 587 },
  'icloud.com': { host: 'smtp.mail.me.com', port: 587 },
};

function leerConfigSmtp() {
  dotenv.config({ override: true });
  const rawHost = (process.env.SMTP_HOST ?? env.SMTP_HOST ?? '').trim();
  const rawPort = Number(process.env.SMTP_PORT ?? env.SMTP_PORT ?? 587) || 587;
  const user = (process.env.SMTP_USER ?? env.SMTP_USER ?? '').trim();
  const pass = (process.env.SMTP_PASS ?? env.SMTP_PASS ?? '').trim();
  const from = (process.env.MAIL_FROM ?? env.MAIL_FROM ?? 'Capacitación SIGECAP <no-reply@sigecap.local>').trim();

  const credencialesValidas = Boolean(
    user &&
    pass &&
    pass !== 'CAMBIAR' &&
    !user.endsWith('@ejemplo.gob.mx') &&
    !user.endsWith('@ejemplo.com'),
  );

  let host = rawHost;
  let port = rawPort;

  // Si no se definió un SMTP_HOST real pero sí un correo de un proveedor conocido, deducirlo automáticamente
  if (HOSTS_EJEMPLO.has(host.toLowerCase()) && credencialesValidas && user.includes('@')) {
    const dominio = user.split('@')[1]?.toLowerCase() ?? '';
    const proveedor = PROVEEDORES_CONOCIDOS[dominio];
    if (proveedor) {
      host = proveedor.host;
      port = proveedor.port;
    }
  }

  const esReal = !HOSTS_EJEMPLO.has(host.toLowerCase()) && (!pass || pass !== 'CAMBIAR');
  return { host, port, user, pass, from, esReal };
}

let transporteEtherealPromise: Promise<Transporter> | null = null;

async function obtenerTransportePrueba(): Promise<{ transporter: Transporter; tipo: 'ethereal' | 'simulacion' }> {
  try {
    if (!transporteEtherealPromise) {
      transporteEtherealPromise = nodemailer.createTestAccount().then((cuenta) =>
        nodemailer.createTransport({
          host: cuenta.smtp.host,
          port: cuenta.smtp.port,
          secure: cuenta.smtp.secure,
          auth: { user: cuenta.user, pass: cuenta.pass },
        }),
      );
    }
    const transporter = await transporteEtherealPromise;
    return { transporter, tipo: 'ethereal' };
  } catch {
    transporteEtherealPromise = null;
    return {
      transporter: nodemailer.createTransport({ jsonTransport: true }),
      tipo: 'simulacion',
    };
  }
}

export interface ResultadoEnvioCorreo {
  modoPrueba: boolean;
  servidor: string;
  urlVistaPrevia?: string;
}

export async function enviarCorreo(para: string | string[], asunto: string, html: string): Promise<ResultadoEnvioCorreo> {
  const cfg = leerConfigSmtp();

  if (cfg.esReal) {
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
    });
    await transporter.verify();
    await transporter.sendMail({
      from: cfg.from,
      to: para,
      subject: asunto,
      html,
    });
    return { modoPrueba: false, servidor: cfg.host };
  }

  const { transporter, tipo } = await obtenerTransportePrueba();
  const info = await transporter.sendMail({
    from: cfg.from,
    to: para,
    subject: asunto,
    html,
  });

  const url = tipo === 'ethereal' ? (nodemailer.getTestMessageUrl(info) || undefined) : undefined;
  if (url) {
    console.info(`[Correo de prueba Ethereal] Para: ${Array.isArray(para) ? para.join(', ') : para} | Vista previa: ${url}`);
  } else {
    console.info(`[Correo simulado] Para: ${Array.isArray(para) ? para.join(', ') : para} | Asunto: ${asunto}`);
  }

  return {
    modoPrueba: true,
    servidor: tipo === 'ethereal' ? 'smtp.ethereal.email' : 'simulación local',
    urlVistaPrevia: url,
  };
}
