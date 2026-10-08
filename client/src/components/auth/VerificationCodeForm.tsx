import { Clock, Mail, RotateCw, ArrowLeft, KeyRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Alert, Button } from '@/components/ui';
import { env } from '@/config/env';
import { useVerificationTimer } from '@/hooks/useVerificationTimer';
import { cn } from '@/utils/cn';
import { VerificationCodeInput } from './VerificationCodeInput';

export interface VerificationCodeFormProps {
  title?: string;
  subtitle?: string;
  email?: string;
  maskedEmail?: string;
  expiresInSeconds?: number;
  resendCooldownSeconds?: number;
  demoCode?: string;
  verifyButtonLabel?: string;
  backLabel?: string;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  onBack?: () => void;
  className?: string;
}

/**
 * Reusable verification-code screen pattern shared across Forgot Password and Registration.
 * Incorporates functional 5-minute code expiration, 60-second resend cooldown,
 * error and expired states, demo quick-fill in mock mode, and full accessible keyboard navigation.
 */
export function VerificationCodeForm({
  title = 'Verification code',
  subtitle,
  email,
  maskedEmail,
  expiresInSeconds = 300,
  resendCooldownSeconds = 60,
  demoCode = '123456',
  verifyButtonLabel = 'Verify code',
  backLabel = 'Back to sign in',
  onVerify,
  onResend,
  onBack,
  className,
}: VerificationCodeFormProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  const timer = useVerificationTimer({
    expiresInSeconds,
    resendCooldownSeconds,
    onExpire: () => {
      setError('Verification code has expired. Please request a new code.');
    },
  });

  const displayEmail = maskedEmail || email;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (timer.isExpired) {
      setError('The verification code has expired. Please request a new code.');
      return;
    }

    if (code.length < 6) {
      setError('Please enter all 6 digits of your verification code.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setResendNotice(null);

    try {
      await onVerify(code);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid verification code. Please try again.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!timer.canResend || resending) return;

    setResending(true);
    setError(null);
    setResendNotice(null);

    try {
      await onResend();
      timer.restart();
      setCode('');
      setResendNotice('A new 6-digit verification code has been dispatched to your email.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to resend code. Please try again.';
      setError(message);
    } finally {
      setResending(false);
    }
  };

  const handleFillDemoCode = () => {
    if (demoCode) {
      setCode(demoCode);
      setError(null);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header Description */}
      <div className="text-center sm:text-left">
        <h2 className="text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">{title}</h2>
        <p className="mt-1.5 text-sm text-zinc-600 leading-relaxed">
          {subtitle || 'Enter the 6-digit verification code sent to your registered email address.'}
        </p>

        {displayEmail && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-700">
            <Mail className="size-3.5 text-zinc-500" aria-hidden />
            <span className="font-medium text-zinc-900">{displayEmail}</span>
          </div>
        )}
      </div>

      {/* Notifications / Alerts */}
      {error && <Alert tone="danger">{error}</Alert>}

      {resendNotice && !error && <Alert tone="success">{resendNotice}</Alert>}

      {timer.isExpired && !error && (
        <Alert tone="warning">
          Your verification code has expired. Click <strong>Resend code</strong> below to receive a new one.
        </Alert>
      )}

      {/* Demo helper in mock mode */}
      {env.useMockApi && demoCode && (
        <div className="flex items-center justify-between rounded-lg border border-gold-500/30 bg-gold-50/60 p-2.5 text-xs text-gold-900">
          <div className="flex items-center gap-2">
            <KeyRound className="size-3.5 text-gold-600" />
            <span>
              Mock Demo Code: <strong className="font-mono text-zinc-900 font-bold">{demoCode}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={handleFillDemoCode}
            className="text-[11px] font-semibold text-gold-700 hover:text-gold-800 underline underline-offset-2 transition-colors cursor-pointer"
          >
            Auto-fill
          </button>
        </div>
      )}

      {/* Code Input Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <div className="py-2">
          <VerificationCodeInput
            value={code}
            onChange={(c) => {
              setCode(c);
              if (error) setError(null);
            }}
            disabled={submitting}
            isExpired={timer.isExpired}
            hasError={Boolean(error)}
          />
        </div>

        {/* Timers & Resend Action Area */}
        <div className="flex flex-col items-center justify-between gap-2.5 rounded-xl border border-zinc-100 bg-zinc-50/70 p-3.5 text-xs text-zinc-600 sm:flex-row">
          {/* Expiration Timer */}
          <div className="flex items-center gap-1.5 font-medium">
            <Clock className={cn('size-3.5', timer.isExpired ? 'text-red-500' : 'text-zinc-400')} />
            {timer.isExpired ? (
              <span className="font-semibold text-red-600">Code expired</span>
            ) : (
              <span>
                Code expires in{' '}
                <strong className="font-mono font-semibold text-zinc-900">{timer.formatExpires}</strong>
              </span>
            )}
          </div>

          {/* Resend Cooldown / Button */}
          <div>
            {timer.canResend ? (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="inline-flex items-center gap-1.5 font-semibold text-gold-700 hover:text-gold-800 transition-colors cursor-pointer hover:underline disabled:opacity-50"
              >
                <RotateCw className={cn('size-3', resending && 'animate-spin')} />
                <span>{resending ? 'Sending...' : 'Resend code'}</span>
              </button>
            ) : (
              <span className="text-zinc-400">
                Resend code in{' '}
                <strong className="font-mono font-medium text-zinc-500">{timer.formatResend}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={submitting}
          disabled={timer.isExpired || code.length < 6}
          className="h-12 rounded-xl bg-ink-950 hover:bg-ink-900 text-white font-semibold text-sm shadow-md transition-all active:scale-[0.99]"
        >
          {verifyButtonLabel}
        </Button>

        {/* Back Link */}
        {onBack && (
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
            >
              <ArrowLeft className="size-3 text-zinc-400" />
              <span>{backLabel}</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
