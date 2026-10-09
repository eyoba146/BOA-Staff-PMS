import { Check, CheckCircle2, Circle, Eye, EyeOff, IdCard, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthStepIndicator } from '@/components/auth/AuthStepIndicator';
import { VerificationCodeForm } from '@/components/auth/VerificationCodeForm';
import { Alert, Button, Field, Input } from '@/components/ui';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { AuthLayout } from '@/layouts/AuthLayout';
import { authService } from '@/services/auth.service';
import { toApiError } from '@/services/http/apiClient';
import { paths } from '@/routes/paths';
import { cn } from '@/utils/cn';
import { PASSWORD_RULES, hasErrors, required, strongPassword, validateForm } from '@/utils/validation';

type ResetStep = 'request' | 'verify' | 'new-password' | 'complete';

const STEPS = [
  { id: 'request', label: 'Account' },
  { id: 'verify', label: 'Verify Code' },
  { id: 'new-password', label: 'New Password' },
  { id: 'complete', label: 'Finished' },
];

/**
 * Multi-step password recovery flow for Bank of Abyssinia staff workstations.
 * Step 1: Request verification code (identifier/email)
 * Step 2: Verify 6-digit code with functional 5-minute expiry & 60-second resend cooldown
 * Step 3: Set new strong password with requirements validation
 * Step 4: Success confirmation with direct transition back to login
 */
export function ForgotPasswordPage() {
  useDocumentTitle('Reset password');
  const navigate = useNavigate();

  const [step, setStep] = useState<ResetStep>('request');
  const [identifier, setIdentifier] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [verificationTimestamps, setVerificationTimestamps] = useState<{
    expiresAt: string | null;
    resendAfter: string | null;
    serverTime: string | null;
  }>({ expiresAt: null, resendAfter: null, serverTime: null });

  // Step 1 state
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestLoading, setRequestLoading] = useState(false);

  // Step 3 state
  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<Partial<Record<'newPassword' | 'confirmPassword', string>>>({});
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  // Step 1: Request Code
  const handleRequestSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setRequestError('Please enter your Employee ID or registered email address.');
      return;
    }

    setRequestLoading(true);
    setRequestError(null);

    try {
      const res = await authService.requestPasswordReset(identifier.trim());
      setMaskedEmail(res.maskedEmail);
      setVerificationTimestamps({
        expiresAt: res.expiresAt ?? null,
        resendAfter: res.resendAfter ?? null,
        serverTime: res.serverTime ?? null,
      });
      setStep('verify');
    } catch (err: unknown) {
      setRequestError(toApiError(err).message);
    } finally {
      setRequestLoading(false);
    }
  };

  // Step 2: Verify Code
  const handleVerifyCode = async (code: string) => {
    const res = await authService.verifyResetCode({
      identifier: identifier.trim(),
      code,
    });
    setResetToken(res.resetToken);
    setStep('new-password');
  };

  // Step 2: Resend Code
  const handleResendCode = async () => {
    const res = await authService.resendResetCode({ identifier: identifier.trim() });
    setVerificationTimestamps({
      expiresAt: res.expiresAt ?? null,
      resendAfter: res.resendAfter ?? null,
      serverTime: res.serverTime ?? null,
    });
  };

  // Step 3: New Password Submit
  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validateForm(passwords, {
      newPassword: [required('New password'), strongPassword],
      confirmPassword: [
        required('Password confirmation'),
        (v) => (v === passwords.newPassword ? undefined : 'Passwords do not match.'),
      ],
    });

    setPasswordErrors(errs);
    setResetError(null);
    if (hasErrors(errs)) return;

    setResetSubmitting(true);
    try {
      await authService.resetPassword({
        identifier: identifier.trim(),
        resetToken,
        newPassword: passwords.newPassword,
      });
      setStep('complete');
    } catch (err: unknown) {
      setResetError(toApiError(err).message);
    } finally {
      setResetSubmitting(false);
    }
  };

  const currentStepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <AuthLayout
      footer={
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-600">
            <span>Remembered your password?</span>
            <Link to={paths.login} className="font-semibold text-zinc-900 underline-offset-4 hover:text-gold-700 hover:underline">
              Back to sign in
            </Link>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400">
            <Lock className="size-3 text-zinc-400" />
            <span>256-bit TLS Encrypted · Internal Branch Terminal Only</span>
          </div>
        </div>
      }
    >
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-7 sm:p-10 shadow-[0_20px_60px_-15px_rgba(14,14,16,0.07),0_2px_8px_rgba(14,14,16,0.04)]">
        {/* Top Gold Gradient Brand Accent Ribbon */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-gold-600 via-gold-400 to-gold-500" />

        {/* Ambient Top Glow */}
        <div className="pointer-events-none absolute -top-20 -right-20 size-48 rounded-full bg-gold-400/10 blur-3xl" />

        {/* Integrated Card Header */}
        <div className="relative flex items-center justify-between border-b border-zinc-100 pb-5">
          <div className="flex items-center gap-3.5">
            <img src="/abyssinia-logo.png" alt="Bank of Abyssinia" className="h-12 w-auto shrink-0 object-contain" />
            <div>
              <p className="text-[11.5px] font-bold tracking-wider text-zinc-400 uppercase">Bank of Abyssinia</p>
              <p className="text-[14.5px] font-semibold text-zinc-900">Staff Account Recovery</p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/30 bg-gold-500/10 px-2.5 py-1 text-[11px] font-medium text-gold-800">
            <ShieldCheck className="size-3 text-gold-600" />
            Identity Verification
          </span>
        </div>

        {/* Step Progress Indicator */}
        <div className="my-6">
          <AuthStepIndicator steps={STEPS} currentStepIndex={currentStepIndex} />
        </div>

        {/* STEP 1: Request Verification Code */}
        {step === 'request' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-[25px]">Reset your password</h1>
              <p className="mt-1 text-[13.5px] text-zinc-500 leading-relaxed">
                Enter your official Employee ID or registered email address. A 6-digit verification code will be sent to confirm your identity.
              </p>
            </div>

            {requestError && <Alert tone="danger">{requestError}</Alert>}

            <form onSubmit={handleRequestSubmit} noValidate className="space-y-5">
              <Field label="Employee ID or registered email" error={requestError ? undefined : undefined} required>
                <Input
                  autoFocus
                  name="identifier"
                  autoComplete="username"
                  leftIcon={<IdCard className="size-4 text-zinc-400" />}
                  placeholder="e.g. BOA-S001 or staff@example.com"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (requestError) setRequestError(null);
                  }}
                  className="h-12 rounded-xl border-zinc-200/90 bg-zinc-50/50 text-sm focus:bg-white focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20"
                />
              </Field>

              <div className="pt-1">
                <Button
                  type="submit"
                  size="lg"
                  fullWidth
                  loading={requestLoading}
                  className="h-12 rounded-xl bg-ink-950 hover:bg-ink-900 text-white font-semibold text-sm shadow-md transition-all active:scale-[0.99]"
                >
                  Continue & Send Code
                </Button>
              </div>

              <div className="text-center">
                <Link
                  to={paths.login}
                  className="inline-flex items-center text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition-colors"
                >
                  Cancel and return to sign in
                </Link>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: Verify Code */}
        {step === 'verify' && (
          <VerificationCodeForm
            title="Verification code"
            subtitle="Enter the 6-digit code sent to your email to verify password reset authorization."
            maskedEmail={maskedEmail}
            expiresAt={verificationTimestamps.expiresAt}
            resendAfter={verificationTimestamps.resendAfter}
            serverTime={verificationTimestamps.serverTime}
            verifyButtonLabel="Verify & Create Password"
            backLabel="Change account identifier"
            onVerify={handleVerifyCode}
            onResend={handleResendCode}
            onBack={() => setStep('request')}
          />
        )}

        {/* STEP 3: Create New Password */}
        {step === 'new-password' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-[25px]">Create new password</h1>
              <p className="mt-1 text-[13.5px] text-zinc-500 leading-relaxed">
                Choose a strong, compliant password for your workstation account.
              </p>
            </div>

            {resetError && <Alert tone="danger">{resetError}</Alert>}

            <form onSubmit={handlePasswordSubmit} noValidate className="space-y-5">
              <Field label="New password" error={passwordErrors.newPassword} required>
                <Input
                  autoFocus
                  name="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  leftIcon={<KeyRound className="size-4 text-zinc-400" />}
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
                  className="h-12 rounded-xl border-zinc-200/90 bg-zinc-50/50 text-sm focus:bg-white focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20"
                  suffix={
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((s) => !s)}
                      className="rounded p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  }
                />
              </Field>

              <Field label="Confirm new password" error={passwordErrors.confirmPassword} required>
                <Input
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  leftIcon={<KeyRound className="size-4 text-zinc-400" />}
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))}
                  className="h-12 rounded-xl border-zinc-200/90 bg-zinc-50/50 text-sm focus:bg-white focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20"
                  suffix={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((s) => !s)}
                      className="rounded p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  }
                />
              </Field>

              {/* Password rules checklist */}
              <ul className="grid gap-1.5 rounded-xl border border-zinc-100 bg-zinc-50/70 p-3.5 text-xs sm:grid-cols-2" aria-label="Password requirements">
                {PASSWORD_RULES.map((rule) => {
                  const met = rule.test(passwords.newPassword);
                  return (
                    <li key={rule.id} className={cn('flex items-center gap-2', met ? 'text-emerald-700 font-medium' : 'text-zinc-500')}>
                      {met ? <Check className="size-3.5 text-emerald-600 stroke-[2.5]" aria-hidden /> : <Circle className="size-3 text-zinc-400" aria-hidden />}
                      <span>{rule.label}</span>
                    </li>
                  );
                })}
              </ul>

              <div className="pt-2">
                <Button
                  type="submit"
                  size="lg"
                  fullWidth
                  loading={resetSubmitting}
                  className="h-12 rounded-xl bg-ink-950 hover:bg-ink-900 text-white font-semibold text-sm shadow-md transition-all active:scale-[0.99]"
                >
                  Reset Password & Finish
                </Button>
              </div>

              <div className="text-center">
                <Link
                  to={paths.login}
                  className="inline-flex items-center text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition-colors"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        )}

        {/* STEP 4: Success State */}
        {step === 'complete' && (
          <div className="space-y-6 text-center py-4">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-xs">
              <CheckCircle2 className="size-8" aria-hidden />
            </div>

            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-950">Password reset complete</h2>
              <p className="mt-2 text-sm text-zinc-600 leading-relaxed max-w-sm mx-auto">
                Your workstation password has been successfully updated. You can now sign in using your new credentials.
              </p>
            </div>

            <div className="pt-2">
              <Button
                type="button"
                size="lg"
                fullWidth
                onClick={() => navigate(paths.login)}
                className="h-12 rounded-xl bg-ink-950 hover:bg-ink-900 text-white font-semibold text-sm shadow-md transition-all active:scale-[0.99]"
              >
                Sign In to Terminal
              </Button>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
