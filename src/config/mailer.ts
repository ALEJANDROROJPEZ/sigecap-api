import nodemailer from 'nodemailer';
import { env } from './env.js';

export const mailer = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
});

export function enviarCorreo(para: string | string[], asunto: string, html: string) {
  return mailer.sendMail({ from: env.MAIL_FROM, to: para, subject: asunto, html });
}
