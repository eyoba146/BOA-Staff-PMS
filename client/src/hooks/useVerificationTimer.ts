import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseVerificationTimerOptions {
  /** Authoritative expiration timestamp from server */
  expiresAt?: string | number | Date | null;
  /** Authoritative resend eligibility timestamp from server */
  resendAfter?: string | number | Date | null;
  /** Authoritative server time at response moment to correct client clock skew */
  serverTime?: string | number | Date | null;
  /** Fallback duration in seconds if no timestamp available */
  expiresInSeconds?: number;
  /** Fallback cooldown in seconds if no timestamp available */
  resendCooldownSeconds?: number;
  onExpire?: () => void;
  onResendAvailable?: () => void;
  autoStart?: boolean;
}

export interface UseVerificationTimerResult {
  expiresRemaining: number;
  resendRemaining: number;
  isExpired: boolean;
  canResend: boolean;
  formatExpires: string;
  formatResend: string;
  restart: (
    newExpires?: string | number | Date | null,
    newCooldown?: string | number | Date | null,
    newServerTime?: string | number | Date | null,
  ) => void;
  stop: () => void;
  sync: (
    expiresAt?: string | number | Date | null,
    resendAfter?: string | number | Date | null,
    serverTime?: string | number | Date | null,
  ) => void;
}

export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function parseTimestamp(ts: string | number | Date | null | undefined): number | null {
  if (ts === null || ts === undefined) return null;
  if (typeof ts === 'number') return ts;
  const parsed = new Date(ts).getTime();
  return isNaN(parsed) ? null : parsed;
}

/**
 * Authoritative, backend-driven countdown timer hook.
 * Calculates remaining time from persistent server timestamps (expiresAt, resendAfter)
 * and adjusts for client/server clock offset.
 * Automatically recalculates on window focus and visibilitychange.
 */
export function useVerificationTimer({
  expiresAt,
  resendAfter,
  serverTime,
  expiresInSeconds = 300,
  resendCooldownSeconds = 60,
  onExpire,
  onResendAvailable,
  autoStart = true,
}: UseVerificationTimerOptions = {}): UseVerificationTimerResult {
  // Clock skew offset: serverNow - clientNow
  const serverOffsetRef = useRef<number>(0);

  const computeOffset = (srvTime?: string | number | Date | null) => {
    const srvMs = parseTimestamp(srvTime);
    return srvMs !== null ? srvMs - Date.now() : 0;
  };

  serverOffsetRef.current = computeOffset(serverTime);

  const getTargetExpires = (exp?: string | number | Date | null, durSec = expiresInSeconds): number => {
    const parsed = parseTimestamp(exp);
    if (parsed !== null) return parsed;
    return Date.now() + serverOffsetRef.current + durSec * 1000;
  };

  const getTargetResend = (res?: string | number | Date | null, coolSec = resendCooldownSeconds): number => {
    const parsed = parseTimestamp(res);
    if (parsed !== null) return parsed;
    return Date.now() + serverOffsetRef.current + coolSec * 1000;
  };

  const expiresAtRef = useRef<number>(getTargetExpires(expiresAt));
  const resendAtRef = useRef<number>(getTargetResend(resendAfter));
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  const onResendAvailableRef = useRef(onResendAvailable);
  onResendAvailableRef.current = onResendAvailable;
  const activeRef = useRef<boolean>(autoStart);

  const calculateRemaining = () => {
    const now = Date.now() + serverOffsetRef.current;
    const expSec = Math.max(0, Math.ceil((expiresAtRef.current - now) / 1000));
    const cdSec = Math.max(0, Math.ceil((resendAtRef.current - now) / 1000));
    return { expSec, cdSec };
  };

  const initial = calculateRemaining();
  const [expiresRemaining, setExpiresRemaining] = useState<number>(initial.expSec);
  const [resendRemaining, setResendRemaining] = useState<number>(initial.cdSec);
  const [isExpired, setIsExpired] = useState(initial.expSec <= 0);

  const sync = useCallback(
    (
      newExpires?: string | number | Date | null,
      newCooldown?: string | number | Date | null,
      newServerTime?: string | number | Date | null,
    ) => {
      if (newServerTime !== undefined) {
        serverOffsetRef.current = computeOffset(newServerTime);
      }
      if (newExpires !== undefined) {
        expiresAtRef.current = getTargetExpires(newExpires);
      }
      if (newCooldown !== undefined) {
        resendAtRef.current = getTargetResend(newCooldown);
      }

      const { expSec, cdSec } = calculateRemaining();
      setExpiresRemaining(expSec);
      setResendRemaining(cdSec);
      setIsExpired(expSec <= 0);
      activeRef.current = true;
    },
    [],
  );

  // Sync whenever incoming props change
  useEffect(() => {
    sync(expiresAt, resendAfter, serverTime);
  }, [expiresAt, resendAfter, serverTime, sync]);

  const restart = useCallback(
    (
      newExpires?: string | number | Date | null,
      newCooldown?: string | number | Date | null,
      newServerTime?: string | number | Date | null,
    ) => {
      sync(newExpires, newCooldown, newServerTime);
    },
    [sync],
  );

  const stop = useCallback(() => {
    activeRef.current = false;
  }, []);

  useEffect(() => {
    const tick = () => {
      if (!activeRef.current) return;
      const { expSec, cdSec } = calculateRemaining();

      setExpiresRemaining(expSec);
      setResendRemaining(cdSec);

      if (expSec <= 0) {
        setIsExpired(true);
        if (onExpireRef.current) {
          onExpireRef.current();
        }
      } else {
        setIsExpired(false);
      }

      if (cdSec <= 0 && onResendAvailableRef.current) {
        onResendAvailableRef.current();
      }
    };

    // Immediate tick
    tick();

    const interval = setInterval(tick, 500);

    const onVisibilityOrFocus = () => {
      tick();
    };

    window.addEventListener('focus', onVisibilityOrFocus);
    document.addEventListener('visibilitychange', onVisibilityOrFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onVisibilityOrFocus);
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
    };
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
    sync,
  };
}
