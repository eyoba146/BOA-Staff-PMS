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
  if (ts === null || ts === undefined || ts === '') return null;
  if (typeof ts === 'number') return isNaN(ts) ? null : ts;
  const parsed = new Date(ts).getTime();
  return isNaN(parsed) ? null : parsed;
}

/**
 * Authoritative, backend-driven countdown timer hook.
 * Calculates remaining time from persistent server timestamps (expiresAt, resendAfter)
 * and adjusts for client/server clock offset without freezing.
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
  // Store the fixed clock offset (serverTime - clientTimeAtReceipt)
  const clockOffsetRef = useRef<number>(0);
  const lastServerTimeKeyRef = useRef<string | null>(null);

  // Absolute target epoch timestamps (in ms)
  const targetExpiresRef = useRef<number>(0);
  const targetResendRef = useRef<number>(0);

  // Control and callback refs
  const activeRef = useRef<boolean>(autoStart);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  const onResendAvailableRef = useRef(onResendAvailable);
  onResendAvailableRef.current = onResendAvailable;

  // Single-fire tracking flags to prevent spamming callbacks every tick
  const hasFiredExpireRef = useRef<boolean>(false);
  const hasFiredResendRef = useRef<boolean>(false);

  // Helper: compute current estimated server time
  const getEstimatedServerNow = useCallback(() => {
    return Date.now() + clockOffsetRef.current;
  }, []);

  // Update target timestamps and clock offset
  const updateTargets = useCallback(
    (
      exp?: string | number | Date | null,
      res?: string | number | Date | null,
      srv?: string | number | Date | null,
    ) => {
      // 1. Clock skew calibration (ONLY update when serverTime changes)
      const srvKey = srv ? String(srv) : null;
      if (srvKey && srvKey !== lastServerTimeKeyRef.current) {
        lastServerTimeKeyRef.current = srvKey;
        const srvMs = parseTimestamp(srv);
        if (srvMs !== null) {
          // Clock skew: serverNow - clientNow at the moment of receipt
          clockOffsetRef.current = srvMs - Date.now();
        }
      } else if (!srvKey && lastServerTimeKeyRef.current === null) {
        clockOffsetRef.current = 0;
      }

      const currentServerNow = Date.now() + clockOffsetRef.current;

      // 2. Expiration target
      const parsedExp = parseTimestamp(exp);
      if (parsedExp !== null) {
        targetExpiresRef.current = parsedExp;
      } else if (!targetExpiresRef.current || exp === null) {
        targetExpiresRef.current = currentServerNow + expiresInSeconds * 1000;
      }

      // 3. Resend cooldown target
      const parsedRes = parseTimestamp(res);
      if (parsedRes !== null) {
        targetResendRef.current = parsedRes;
      } else if (!targetResendRef.current || res === null) {
        targetResendRef.current = currentServerNow + resendCooldownSeconds * 1000;
      }

      // Reset callback flags if targets are in the future
      if (targetExpiresRef.current > currentServerNow) {
        hasFiredExpireRef.current = false;
      }
      if (targetResendRef.current > currentServerNow) {
        hasFiredResendRef.current = false;
      }
    },
    [expiresInSeconds, resendCooldownSeconds],
  );

  // Initialize targets on mount
  const isInitializedRef = useRef<boolean>(false);
  if (!isInitializedRef.current) {
    updateTargets(expiresAt, resendAfter, serverTime);
    isInitializedRef.current = true;
  }

  // Calculate remaining seconds
  const calculateSeconds = useCallback(() => {
    const currentServerNow = getEstimatedServerNow();
    const expRemaining = Math.max(0, Math.ceil((targetExpiresRef.current - currentServerNow) / 1000));
    const resRemaining = Math.max(0, Math.ceil((targetResendRef.current - currentServerNow) / 1000));
    return {
      expRemaining,
      resRemaining,
      expired: expRemaining <= 0,
      resendEligible: resRemaining <= 0,
    };
  }, [getEstimatedServerNow]);

  const initial = calculateSeconds();
  const [expiresRemaining, setExpiresRemaining] = useState<number>(initial.expRemaining);
  const [resendRemaining, setResendRemaining] = useState<number>(initial.resRemaining);
  const [isExpired, setIsExpired] = useState<boolean>(initial.expired);

  // Re-sync when props change
  useEffect(() => {
    updateTargets(expiresAt, resendAfter, serverTime);
    const { expRemaining, resRemaining, expired } = calculateSeconds();
    setExpiresRemaining(expRemaining);
    setResendRemaining(resRemaining);
    setIsExpired(expired);
    activeRef.current = true;
  }, [expiresAt, resendAfter, serverTime, updateTargets, calculateSeconds]);

  // Tick function executed on interval
  const tick = useCallback(() => {
    if (!activeRef.current) return;
    const { expRemaining, resRemaining, expired, resendEligible } = calculateSeconds();

    setExpiresRemaining(expRemaining);
    setResendRemaining(resRemaining);
    setIsExpired(expired);

    // Fire callbacks ONCE per cycle transition
    if (expired && !hasFiredExpireRef.current) {
      hasFiredExpireRef.current = true;
      if (onExpireRef.current) {
        onExpireRef.current();
      }
    }

    if (resendEligible && !hasFiredResendRef.current) {
      hasFiredResendRef.current = true;
      if (onResendAvailableRef.current) {
        onResendAvailableRef.current();
      }
    }
  }, [calculateSeconds]);

  // Main timer interval + window visibility re-alignment
  useEffect(() => {
    tick();
    const interval = setInterval(tick, 500);

    const handleVisibility = () => {
      tick();
    };

    window.addEventListener('focus', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleVisibility);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [tick]);

  const sync = useCallback(
    (
      newExpires?: string | number | Date | null,
      newCooldown?: string | number | Date | null,
      newServerTime?: string | number | Date | null,
    ) => {
      updateTargets(newExpires, newCooldown, newServerTime);
      const { expRemaining, resRemaining, expired } = calculateSeconds();
      setExpiresRemaining(expRemaining);
      setResendRemaining(resRemaining);
      setIsExpired(expired);
      activeRef.current = true;
    },
    [updateTargets, calculateSeconds],
  );

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
