import { env } from './env.js';
import { logger } from '../utils/logger.js';

interface SendEmailParams {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export async function sendTransactionalEmail({
  to,
  toName,
  subject,
  htmlContent,
  textContent,
}: SendEmailParams): Promise<boolean> {
  if (!env.BREVO_API_KEY) {
    logger.info('[BREVO DEV MODE] Email dispatch simulated (BREVO_API_KEY not configured)', {
      recipient: to,
      subject,
    });
    return true;
  }

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: env.BREVO_SENDER_NAME,
          email: env.BREVO_SENDER_EMAIL,
        },
        to: [{ email: to, name: toName || to }],
        subject,
        htmlContent,
        textContent,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      logger.error('Brevo email dispatch failed', { status: res.status, error: errBody });
      return false;
    }

    logger.info('Brevo email sent successfully', { recipient: to, subject });
    return true;
  } catch (err) {
    logger.error('Brevo API network exception', { error: String(err) });
    return false;
  }
}
