import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { hashCode, verifyCodeHash } from '../utils/code.js';

export interface StoredVerificationCode {
  id: string;
  target: string;
  codeHash: string;
  purpose: 'email_verification' | 'password_reset';
  expiresAt: Date;
  resendAfter: Date;
  consumed: boolean;
  resetToken?: string | null;
  createdAt: Date;
}

const memoryCodes: StoredVerificationCode[] = [];

export interface CreateCodeParams {
  target: string;
  code: string;
  purpose: 'email_verification' | 'password_reset';
  expiresInSeconds?: number;
  cooldownSeconds?: number;
  resetToken?: string;
}

export const verificationRepository = {
  async invalidateActiveCodes(
    target: string,
    purpose: 'email_verification' | 'password_reset',
  ): Promise<void> {
    const cleanTarget = target.trim().toLowerCase();
    if (env.DATABASE_URL) {
      try {
        await prisma.verificationCode.updateMany({
          where: {
            target: cleanTarget,
            purpose,
            consumed: false,
          },
          data: { consumed: true },
        });
        return;
      } catch {
        // Fall back to memory
      }
    }
    for (const c of memoryCodes) {
      if (c.target === cleanTarget && c.purpose === purpose && !c.consumed) {
        c.consumed = true;
      }
    }
  },

  async createCode({
    target,
    code,
    purpose,
    expiresInSeconds = 300,
    cooldownSeconds = 60,
    resetToken,
  }: CreateCodeParams): Promise<{
    code: string;
    expiresAt: Date;
    resendAfter: Date;
    expiresInSeconds: number;
    resendCooldownSeconds: number;
  }> {
    const cleanTarget = target.trim().toLowerCase();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInSeconds * 1000);
    const resendAfter = new Date(now.getTime() + cooldownSeconds * 1000);
    const codeHash = hashCode(code);

    // Atomically invalidate previous unconsumed codes for this target and purpose
    await this.invalidateActiveCodes(cleanTarget, purpose);

    if (env.DATABASE_URL) {
      try {
        await prisma.verificationCode.create({
          data: {
            target: cleanTarget,
            codeHash,
            purpose,
            expiresAt,
            resendAfter,
            consumed: false,
            resetToken,
          },
        });
        return { code, expiresAt, resendAfter, expiresInSeconds, resendCooldownSeconds: cooldownSeconds };
      } catch {
        // Fall back to memory
      }
    }

    memoryCodes.push({
      id: `vc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      target: cleanTarget,
      codeHash,
      purpose,
      expiresAt,
      resendAfter,
      consumed: false,
      resetToken: resetToken ?? null,
      createdAt: now,
    });

    return { code, expiresAt, resendAfter, expiresInSeconds, resendCooldownSeconds: cooldownSeconds };
  },

  async findLatest(
    target: string,
    purpose: 'email_verification' | 'password_reset',
  ): Promise<StoredVerificationCode | null> {
    const cleanTarget = target.trim().toLowerCase();

    if (env.DATABASE_URL) {
      try {
        const record = await prisma.verificationCode.findFirst({
          where: {
            target: cleanTarget,
            purpose,
            consumed: false,
          },
          orderBy: { createdAt: 'desc' },
        });
        if (record) {
          return {
            id: record.id,
            target: record.target,
            codeHash: record.codeHash,
            purpose: record.purpose as 'email_verification' | 'password_reset',
            expiresAt: record.expiresAt,
            resendAfter: record.resendAfter,
            consumed: record.consumed,
            resetToken: record.resetToken,
            createdAt: record.createdAt,
          };
        }
      } catch {
        // Fall back to memory
      }
    }

    const matches = memoryCodes
      .filter((c) => c.target === cleanTarget && c.purpose === purpose && !c.consumed)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return matches[0] ?? null;
  },

  async findLatestAny(
    target: string,
    purpose: 'email_verification' | 'password_reset',
  ): Promise<StoredVerificationCode | null> {
    const cleanTarget = target.trim().toLowerCase();

    if (env.DATABASE_URL) {
      try {
        const record = await prisma.verificationCode.findFirst({
          where: {
            target: cleanTarget,
            purpose,
          },
          orderBy: { createdAt: 'desc' },
        });
        if (record) {
          return {
            id: record.id,
            target: record.target,
            codeHash: record.codeHash,
            purpose: record.purpose as 'email_verification' | 'password_reset',
            expiresAt: record.expiresAt,
            resendAfter: record.resendAfter,
            consumed: record.consumed,
            resetToken: record.resetToken,
            createdAt: record.createdAt,
          };
        }
      } catch {
        // Fall back to memory
      }
    }

    const matches = memoryCodes
      .filter((c) => c.target === cleanTarget && c.purpose === purpose)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return matches[0] ?? null;
  },

  async findByResetToken(resetToken: string): Promise<StoredVerificationCode | null> {
    if (env.DATABASE_URL) {
      try {
        const record = await prisma.verificationCode.findFirst({
          where: {
            resetToken,
            purpose: 'password_reset',
            consumed: false,
          },
          orderBy: { createdAt: 'desc' },
        });
        if (record) {
          return {
            id: record.id,
            target: record.target,
            codeHash: record.codeHash,
            purpose: 'password_reset',
            expiresAt: record.expiresAt,
            resendAfter: record.resendAfter,
            consumed: record.consumed,
            resetToken: record.resetToken,
            createdAt: record.createdAt,
          };
        }
      } catch {
        // Fall back to memory
      }
    }

    return (
      memoryCodes.find(
        (c) => c.resetToken === resetToken && c.purpose === 'password_reset' && !c.consumed,
      ) ?? null
    );
  },

  async markConsumed(id: string): Promise<void> {
    if (env.DATABASE_URL) {
      try {
        await prisma.verificationCode.update({
          where: { id },
          data: { consumed: true },
        });
        return;
      } catch {
        // Fall back to memory
      }
    }

    const item = memoryCodes.find((c) => c.id === id);
    if (item) {
      item.consumed = true;
    }
  },

  verifyHash(inputCode: string, storedHash: string): boolean {
    return verifyCodeHash(inputCode, storedHash);
  },
};
