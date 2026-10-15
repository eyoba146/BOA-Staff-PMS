import { env } from './env.js';
import { logger } from '../utils/logger.js';

export interface SendEmailParams {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  status: 'sent' | 'failed' | 'simulated';
  error?: string;
}

export async function sendTransactionalEmailDetailed({
  to,
  toName,
  subject,
  htmlContent,
  textContent,
}: SendEmailParams): Promise<EmailSendResult> {
  if (!env.BREVO_API_KEY) {
    logger.info('[BREVO DEV MODE] Email dispatch simulated (BREVO_API_KEY not configured)', {
      recipient: to,
      subject,
    });
    return { success: true, status: 'simulated', messageId: `sim_${Date.now()}` };
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
      return { success: false, status: 'failed', error: `HTTP ${res.status}: ${errBody.slice(0, 200)}` };
    }

    const data: any = await res.json().catch(() => ({}));
    logger.info('Brevo email sent successfully', { recipient: to, subject, messageId: data?.messageId });
    return { success: true, status: 'sent', messageId: data?.messageId };
  } catch (err: any) {
    const errorMsg = String(err?.message || err);
    logger.error('Brevo API network exception', { error: errorMsg });
    return { success: false, status: 'failed', error: errorMsg };
  }
}

export async function sendTransactionalEmail(params: SendEmailParams): Promise<boolean> {
  const result = await sendTransactionalEmailDetailed(params);
  return result.success;
}

