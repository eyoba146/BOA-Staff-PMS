import crypto from 'crypto';

export function generateVerificationCode(): string {
  // 6-digit numeric string between 100000 and 999999
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateReferenceId(): string {
  // Tracking reference ID e.g. REG-748291
  return `REG-${Math.floor(100000 + Math.random() * 900000)}`;
}

export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code.trim()).digest('hex');
}

export function verifyCodeHash(code: string, hash: string): boolean {
  const incomingHash = hashCode(code);
  return crypto.timingSafeEqual(Buffer.from(incomingHash), Buffer.from(hash));
}
