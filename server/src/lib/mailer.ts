import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env.js';

let transporter: Transporter | null = null;

// Lazily build a transport. With SMTP_* configured we send for real; otherwise we use
// Nodemailer's JSON transport and log to the console (dev/test) — no network required.
function getTransporter(): Transporter {
  if (transporter) return transporter;

  if (env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  } else {
    transporter = nodemailer.createTransport({ jsonTransport: true });
  }
  return transporter;
}

export async function sendMail(to: string, subject: string, text: string): Promise<boolean> {
  try {
    const info = await getTransporter().sendMail({ from: env.MAIL_FROM, to, subject, text });
    if (!env.SMTP_HOST && env.NODE_ENV !== 'test') {
      // eslint-disable-next-line no-console
      console.log(`📧 [dev email] → ${to} | ${subject}`);
    }
    return Boolean(info);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Email send failed:', err);
    return false;
  }
}
