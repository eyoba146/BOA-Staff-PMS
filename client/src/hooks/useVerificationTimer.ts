import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseVerificationTimerOptions {
  expiresInSeconds?: number;
  resendCooldownSeconds?: number;
  onExpire?: () => void;
  autoStart?: boolean;
}

export interface UseVerificationTimerResult {
  expiresRemaining: number;
  resendRemaining: number;
  isExpired: boolean;
  canResend: boolean;
  formatExpires: string;
  formatResend: string;
  restart: (newExpires?: number, newCooldown?: number) => void;
  stop: () => void;
}

export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Robust countdown timer hook for verification code expiration and resend cooldown.
 * Uses target timestamps rather than naive interval decrements to prevent tab-throttling drift.
 */
export function useVerificationTimer({
  expiresInSeconds = 300,
  resendCooldownSeconds = 60,
  onExpire,
  autoStart = true,
}: UseVerificationTimerOptions = {}): UseVerificationTimerResult {
  const [expiresRemaining, setExpiresRemaining] = useState<number>(expiresInSeconds);
  const [resendRemaining, setResendRemaining] = useState<number>(resendCooldownSeconds);
  const [isExpired, setIsExpired] = useState(false);

  const expiresAtRef = useRef<number>(Date.now() + expiresInSeconds * 1000);
  const resendAtRef = useRef<number>(Date.now() + resendCooldownSeconds * 1000);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const activeRef = useRef<boolean>(autoStart);

  const restart = useCallback((newExpires?: number, newCooldown?: number) => {
    const exp = newExpires ?? expiresInSeconds;
    const cd = newCooldown ?? resendCooldownSeconds;
    const now = Date.now();
    expiresAtRef.current = now + exp * 1000;
    resendAtRef.current = now + cd * 1000;
    setExpiresRemaining(exp);
    setResendRemaining(cd);
    setIsExpired(false);
    activeRef.current = true;
  }, [expiresInSeconds, resendCooldownSeconds]);

  const stop = useCallback(() => {
    activeRef.current = false;
  }, []);

  useEffect(() => {
    if (!activeRef.current) return;

    const interval = setInterval(() => {
      if (!activeRef.current) return;

      const now = Date.now();
      const expSec = Math.max(0, Math.ceil((expiresAtRef.current - now) / 1000));
      const cdSec = Math.max(0, Math.ceil((resendAtRef.current - now) / 1000));

      setExpiresRemaining(expSec);
      setResendRemaining(cdSec);

      if (expSec === 0) {
        setIsExpired(true);
        if (onExpireRef.current) {
          onExpireRef.current();
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return {
    expiresRemaining,
    resendRemaining,
    isExpired,
    canResend: resendRemaining <= 0,
    formatExpires: formatCountdown(expiresRemaining),
    formatResend: formatCountdown(resendRemaining),
    restart,
    stop,
  };
}
