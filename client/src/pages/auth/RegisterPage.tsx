import { ArrowRight, Building2, Check, Circle, Clock, Copy, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthStepIndicator } from '@/components/auth/AuthStepIndicator';
import { PositionSelect } from '@/components/auth/PositionSelect';
import { VerificationCodeForm } from '@/components/auth/VerificationCodeForm';
import { Alert, Button, Checkbox, Field, Input } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { AuthLayout } from '@/layouts/AuthLayout';
import { authService } from '@/services/auth.service';
import { toApiError } from '@/services/http/apiClient';
import { paths } from '@/routes/paths';
import { cn } from '@/utils/cn';
import {
  email,
  hasErrors,
  minLength,
  PASSWORD_RULES,
  phone,
  required,
  strongPassword,
  validateForm,
  type Validator,
} from '@/utils/validation';

type RegisterStep = 'form' | 'verify' | 'pending-approval';

const REG_STEPS = [
  { id: 'form', label: 'Registration' },
  { id: 'verify', label: 'Email Verification' },
  { id: 'pending-approval', label: 'Manager Approval' },
];

type Values = {
  fullName: string;
  position: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};
type Errors = Partial<Record<keyof Values | 'declaration', string>>;

const initialValues: Values = {
  fullName: '',
  position: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
};

function Section({ title, step, children }: { title: string; step: number; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-4 flex items-center gap-2.5 text-sm font-semibold text-zinc-900">
        <span className="flex size-6 items-center justify-center rounded-full bg-ink-950 text-gold-400 text-xs font-bold border border-gold-500/40 shadow-xs">
          {step}
        </span>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

/**
 * AUTH-02 — Multi-step staff registration experience.
 * Step 1: Staff registration details & credential setup (Employee ID assigned later by management)
 * Step 2: Email verification with 6-digit code, 5m expiry, 60s cooldown
 * Step 3: Confirmation: Email verified & pending branch manager review
 */
export function RegisterPage() {
  useDocumentTitle('Request an account');
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const navState = location.state as {
    step?: RegisterStep;
    email?: string;
    referenceId?: string;
  } | null;

  const urlEmail = searchParams.get('email') || '';
  const initialStep: RegisterStep =
    navState?.step || (searchParams.get('step') === 'verify' ? 'verify' : 'form');

  const [step, setStep] = useState<RegisterStep>(initialStep);
  const [values, setValues] = useState<Values>(initialValues);
  const [declared, setDeclared] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Verification metadata & authoritative timestamps
  const [registeredEmail, setRegisteredEmail] = useState(
    navState?.email || urlEmail,
  );
  const [referenceId, setReferenceId] = useState(navState?.referenceId || '');
  const [verificationTimestamps, setVerificationTimestamps] = useState<{
    expiresAt: string | null;
    resendAfter: string | null;
    serverTime: string | null;
  }>({ expiresAt: null, resendAfter: null, serverTime: null });

  // Unverified account recovery state
  const [pendingRecovery, setPendingRecovery] = useState<{
    email: string;
    referenceId?: string;
  } | null>(null);

  // Direct recovery input when email is not present in URL/state
  const [resumeInput, setResumeInput] = useState('');
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);

  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleCopyReference = () => {
    if (!referenceId) return;
    void navigator.clipboard.writeText(referenceId);
    setCopied(true);
    showToast({
      tone: 'gold',
      title: 'Reference ID Copied',
      message: `${referenceId} copied to clipboard for tracking.`,
    });
    setTimeout(() => setCopied(false), 2500);
  };

  useEffect(() => {
    if (navState?.email) setRegisteredEmail(navState.email);
    if (navState?.referenceId) setReferenceId(navState.referenceId);
  }, [navState]);

  // Query authoritative server verification timestamps when on verify step
  useEffect(() => {
    if (step !== 'verify' || !registeredEmail.trim()) return;

    let cancelled = false;
    const loadVerificationStatus = async () => {
      try {
        const status = await authService.getVerificationStatus(
          registeredEmail.trim(),
          'email_verification',
        );
        if (cancelled) return;

        if (status.status === 'pending_approval' || status.status === 'active') {
          if (status.referenceId) setReferenceId(status.referenceId);
          setStep('pending-approval');
          return;
        }

        if (status.referenceId) setReferenceId(status.referenceId);
        setVerificationTimestamps({
          expiresAt: status.expiresAt,
          resendAfter: status.resendAfter,
          serverTime: status.serverTime,
        });
      } catch {
        // Leave existing timestamps or allow retry
      }
    };

    void loadVerificationStatus();
    return () => {
      cancelled = true;
    };
  }, [step, registeredEmail]);

  const set = (key: keyof Values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const matches: Validator = (v) => (v === values.password ? undefined : 'Passwords do not match.');

  // Step 1: Submit Registration
  const onSubmitForm = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Errors = validateForm(values, {
      fullName: [required('Full name'), minLength(3, 'Full name')],
      position: [required('Position')],
      email: [required('Email'), email],
      phone: [required('Phone number'), phone],
      password: [required('Password'), strongPassword],
      confirmPassword: [required('Password confirmation'), matches],
    });
    if (!declared) errs.declaration = 'Please confirm the declaration.';
    setErrors(errs);
    setFormError(null);
    setPendingRecovery(null);
    if (hasErrors(errs)) return;

    setSubmitting(true);
    try {
      const { password, ...rest } = values;
      const res = await authService.register({ ...rest, password });
      setReferenceId(res.referenceId);
      setRegisteredEmail(res.email);
      setVerificationTimestamps({
        expiresAt: res.expiresAt ?? null,
        resendAfter: res.resendAfter ?? null,
        serverTime: res.serverTime ?? null,
      });
      setStep('verify');
      navigate(`${paths.register}?step=verify&email=${encodeURIComponent(res.email)}`, {
        replace: true,
        state: { step: 'verify', email: res.email, referenceId: res.referenceId },
      });
    } catch (err) {
      const apiErr = toApiError(err);
      if (apiErr.code === 'EMAIL_VERIFICATION_PENDING') {
        const pendingEmail = apiErr.fieldErrors?.email || values.email.trim().toLowerCase();
        const pendingRef = apiErr.fieldErrors?.referenceId || '';
        setFormError(apiErr.message);
        setPendingRecovery({ email: pendingEmail, referenceId: pendingRef });
      } else {
        setFormError(apiErr.message);
        if (apiErr.fieldErrors) setErrors((prev) => ({ ...prev, ...apiErr.fieldErrors }));
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2: Verify Code
  const handleVerifyEmail = async (code: string) => {
    try {
      const res = await authService.verifyEmail({
        email: registeredEmail,
        referenceId,
        code,
      });
      if (res.referenceId) setReferenceId(res.referenceId);
      setStep('pending-approval');
    } catch (err) {
      const apiErr = toApiError(err);
      if (apiErr.code === 'ALREADY_VERIFIED') {
        setStep('pending-approval');
        return;
      }
      throw err;
    }
  };

  // Step 2: Resend Code with authoritative timestamps
  const handleResendCode = async () => {
    const res = await authService.resendEmailCode({
      email: registeredEmail,
      referenceId,
    });
    setVerificationTimestamps({
      expiresAt: res.expiresAt ?? null,
      resendAfter: res.resendAfter ?? null,
      serverTime: res.serverTime ?? null,
    });
  };

  // Manual resume lookup if user navigated directly without query parameters
  const handleResumeLookup = async (e: FormEvent) => {
    e.preventDefault();
    if (!resumeInput.trim()) {
      setResumeError('Please enter your registered email address or reference ID.');
      return;
    }
    setResumeLoading(true);
    setResumeError(null);
    try {
      const status = await authService.getVerificationStatus(
        resumeInput.trim(),
        'email_verification',
      );
      if (status.status === 'pending_approval' || status.status === 'active') {
        if (status.referenceId) setReferenceId(status.referenceId);
        setStep('pending-approval');
        return;
      }
      setRegisteredEmail(status.email);
      if (status.referenceId) setReferenceId(status.referenceId);
      setVerificationTimestamps({
        expiresAt: status.expiresAt,
        resendAfter: status.resendAfter,
        serverTime: status.serverTime,
      });
      navigate(`${paths.register}?step=verify&email=${encodeURIComponent(status.email)}`, {
        replace: true,
        state: { step: 'verify', email: status.email, referenceId: status.referenceId },
      });
    } catch (err) {
      setResumeError(toApiError(err).message);
    } finally {
      setResumeLoading(false);
    }
  };

  const currentStepIndex = REG_STEPS.findIndex((s) => s.id === step);

  return (
    <AuthLayout
      wide={step === 'form'}
      footer={
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-600">
            <span>Already have an authorized account?</span>
            <Link to={paths.login} className="font-semibold text-zinc-900 underline-offset-4 hover:text-gold-700 hover:underline">
              Sign in
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
              <p className="text-[14.5px] font-semibold text-zinc-900">Staff Account Registration</p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/30 bg-gold-500/10 px-2.5 py-1 text-[11px] font-medium text-gold-800">
            <ShieldCheck className="size-3 text-gold-600" />
            Staff Authorization
          </span>
        </div>

        {/* Step Progress Indicator */}
        <div className="my-6">
          <AuthStepIndicator steps={REG_STEPS} currentStepIndex={currentStepIndex} />
        </div>

        {/* STEP 1: Registration Form */}
        {step === 'form' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-[25px]">Request a staff account</h1>
              <p className="mt-1 text-[13.5px] text-zinc-500 leading-relaxed">
                Submit your official branch credentials. You will verify your email before entering manager approval.
              </p>
            </div>

            {formError && (
              <Alert
                tone={pendingRecovery ? 'warning' : 'danger'}
                title={pendingRecovery ? 'Account Already Registered' : undefined}
                action={
                  pendingRecovery ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setRegisteredEmail(pendingRecovery.email);
                        if (pendingRecovery.referenceId) setReferenceId(pendingRecovery.referenceId);
                        setStep('verify');
                        navigate(
                          `${paths.register}?step=verify&email=${encodeURIComponent(pendingRecovery.email)}`,
                          {
                            replace: true,
                            state: {
                              step: 'verify',
                              email: pendingRecovery.email,
                              referenceId: pendingRecovery.referenceId,
                            },
                          },
                        );
                      }}
                    >
                      Resume Email Verification
                    </Button>
                  ) : undefined
                }
              >
                {formError}
              </Alert>
            )}

            <form onSubmit={onSubmitForm} noValidate className="space-y-7">
              <Section step={1} title="Personal information">
                <Field label="Full name" error={errors.fullName} required>
                  <Input
                    autoFocus
                    autoComplete="name"
                    value={values.fullName}
                    onChange={set('fullName')}
                    placeholder="First, father's, and grandfather's name"
                    className="h-11 rounded-xl"
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Email address" error={errors.email} required hint="Used for email verification code">
                    <Input
                      type="email"
                      autoComplete="email"
                      value={values.email}
                      onChange={set('email')}
                      placeholder="e.g. staff@example.com"
                      className="h-11 rounded-xl"
                    />
                  </Field>
                  <Field label="Phone number" error={errors.phone} required>
                    <Input
                      type="tel"
                      autoComplete="tel"
                      value={values.phone}
                      onChange={set('phone')}
                      placeholder="09XX XXX XXX"
                      className="h-11 rounded-xl"
                    />
                  </Field>
                </div>
              </Section>

              <Section step={2} title="Employment details">
                <Field
                  label="Branch Position"
                  error={errors.position}
                  required
                  hint="Select your official branch role from the approved positions list"
                >
                  <PositionSelect
                    value={values.position}
                    onChange={(pos) => {
                      setValues((v) => ({ ...v, position: pos }));
                      if (errors.position) setErrors((e) => ({ ...e, position: undefined }));
                    }}
                    error={errors.position}
                  />
                </Field>

                <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3.5 text-xs text-zinc-600 space-y-1">
                  <div className="flex items-center gap-2 font-medium text-zinc-900">
                    <ShieldCheck className="size-4 text-gold-600" />
                    <span>Official Employee ID Assignment</span>
                  </div>
                  <p className="text-zinc-500 leading-relaxed pl-6">
                    Official Employee IDs are assigned and confirmed directly by branch management during application review. You do not enter an Employee ID during self-registration.
                  </p>
                </div>
              </Section>

              <Section step={3} title="Account security">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Password" error={errors.password} required>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={values.password}
                      onChange={set('password')}
                      className="h-11 rounded-xl"
                      suffix={
                        <button
                          type="button"
                          onClick={() => setShowPassword((s) => !s)}
                          className="rounded p-1 text-zinc-400 hover:text-zinc-700 transition-colors"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      }
                    />
                  </Field>
                  <Field label="Confirm password" error={errors.confirmPassword} required>
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={values.confirmPassword}
                      onChange={set('confirmPassword')}
                      className="h-11 rounded-xl"
                      suffix={
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((s) => !s)}
                          className="rounded p-1 text-zinc-400 hover:text-zinc-700 transition-colors"
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      }
                    />
                  </Field>
                </div>

                <ul className="grid gap-1.5 rounded-xl border border-zinc-100 bg-zinc-50/70 p-3.5 text-xs sm:grid-cols-2" aria-label="Password requirements">
                  {PASSWORD_RULES.map((rule) => {
                    const ok = rule.test(values.password);
                    return (
                      <li key={rule.id} className={cn('flex items-center gap-2', ok ? 'text-emerald-700 font-medium' : 'text-zinc-500')}>
                        {ok ? <Check className="size-3.5 text-emerald-600 stroke-[2.5]" aria-hidden /> : <Circle className="size-3 text-zinc-400" aria-hidden />}
                        <span>{rule.label}</span>
                      </li>
                    );
                  })}
                </ul>
              </Section>

              <div className="space-y-2 border-t border-zinc-100 pt-5">
                <Checkbox
                  checked={declared}
                  onChange={(e) => setDeclared(e.target.checked)}
                  invalid={!!errors.declaration}
                  label="I confirm the information above is accurate and that I am an authorized employee of this branch."
                />
                {errors.declaration && (
                  <p role="alert" className="pl-6.5 text-[13px] text-red-700">
                    {errors.declaration}
                  </p>
                )}
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
                <p className="text-[12.5px] text-zinc-500">
                  Step 1 of 3: You will verify your email next.
                </p>
                <Button
                  type="submit"
                  size="lg"
                  loading={submitting}
                  className="h-12 rounded-xl bg-ink-950 hover:bg-ink-900 text-white font-semibold text-sm shadow-md transition-all active:scale-[0.99] px-7"
                >
                  Continue to Email Verification
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: Email Verification */}
        {step === 'verify' && !registeredEmail && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">Resume email verification</h2>
              <p className="mt-1.5 text-sm text-zinc-600 leading-relaxed">
                Enter your registered branch email address or reference ID to resume email verification for your pending staff account.
              </p>
            </div>

            {resumeError && <Alert tone="danger">{resumeError}</Alert>}

            <form onSubmit={handleResumeLookup} noValidate className="space-y-4">
              <Field label="Registered Email Address or Reference ID" required>
                <Input
                  autoFocus
                  value={resumeInput}
                  onChange={(e) => {
                    setResumeInput(e.target.value);
                    if (resumeError) setResumeError(null);
                  }}
                  placeholder="e.g. staff@example.com or REG-123456"
                  className="h-12 rounded-xl"
                />
              </Field>

              <div className="flex flex-col-reverse sm:flex-row items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  fullWidth
                  onClick={() => setStep('form')}
                  className="h-12 rounded-xl font-semibold text-sm"
                >
                  Return to Registration Form
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  fullWidth
                  loading={resumeLoading}
                  className="h-12 rounded-xl bg-ink-950 hover:bg-ink-900 text-white font-semibold text-sm shadow-md transition-all active:scale-[0.99]"
                >
                  Find Account & Continue
                </Button>
              </div>
            </form>
          </div>
        )}

        {step === 'verify' && registeredEmail && (
          <VerificationCodeForm
            title="Verify your email"
            subtitle="A 6-digit verification code has been sent to your registered email address. Complete verification to submit your account for branch manager approval."
            email={registeredEmail}
            expiresAt={verificationTimestamps.expiresAt}
            resendAfter={verificationTimestamps.resendAfter}
            serverTime={verificationTimestamps.serverTime}
            verifyButtonLabel="Verify Email & Continue"
            backLabel="Review registration details"
            onVerify={handleVerifyEmail}
            onResend={handleResendCode}
            onBack={() => setStep('form')}
          />
        )}

        {/* STEP 3: Email Verified & Pending Manager Approval */}
        {step === 'pending-approval' && (
          <div className="space-y-6 text-left py-1 animate-in fade-in duration-300">
            {/* Header Hero Section */}
            <div className="relative overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-5 sm:p-6 shadow-xs">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-gold-500 via-amber-400 to-gold-600" />
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-800">
                    <ShieldCheck className="size-3.5 text-emerald-600" />
                    Email Verified
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-900">
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
                    </span>
                    Manager Review Pending
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                  <Building2 className="size-3.5 text-gold-600" />
                  <span>Finfine Main Branch</span>
                </div>
              </div>

              <div className="pt-4">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-ink-950">
                  Account Queued for Manager Approval
                </h2>
                <p className="mt-1.5 text-sm text-zinc-600 leading-relaxed">
                  Your email address <strong className="text-zinc-900 font-semibold">{registeredEmail}</strong> has been authenticated. Your candidate profile is registered and pending review by Branch Manager Abebe Kebede.
                </p>
              </div>
            </div>

            {/* Official Registration Reference Instrument */}
            <div className="relative overflow-hidden rounded-2xl border border-gold-500/35 bg-gradient-to-br from-white via-gold-50/20 to-white p-5 sm:p-6 shadow-sm ring-1 ring-gold-500/15">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gold-500/20">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gold-700">
                    Official Registration Reference
                  </span>
                  <div className="mt-1 flex items-center gap-3">
                    <span className="font-mono text-2xl sm:text-3xl font-black text-ink-950 tracking-wider">
                      {referenceId || 'REG-PENDING'}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyReference}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all shadow-xs active:scale-95 cursor-pointer',
                        copied
                          ? 'border-emerald-500/40 bg-emerald-50 text-emerald-800'
                          : 'border-gold-500/40 bg-white hover:bg-gold-50/80 text-ink-950'
                      )}
                      title="Copy Reference ID"
                    >
                      {copied ? (
                        <>
                          <Check className="size-3.5 text-emerald-600 stroke-[2.5]" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5 text-gold-600" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-gold-500/25 bg-gold-50/60 px-3.5 py-2 sm:text-right">
                  <p className="text-[11px] font-medium text-gold-800">Assigned Branch</p>
                  <p className="text-xs font-bold text-ink-950">Finfine Main Branch (001)</p>
                </div>
              </div>

              {/* Candidate Quick Overview Grid */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="rounded-xl border border-zinc-200/80 bg-white/90 p-3">
                  <span className="text-zinc-500 block text-[11px]">Applicant Name</span>
                  <span className="font-semibold text-zinc-900 text-sm mt-0.5 block truncate">
                    {values.fullName || 'Registered Candidate'}
                  </span>
                </div>
                <div className="rounded-xl border border-zinc-200/80 bg-white/90 p-3">
                  <span className="text-zinc-500 block text-[11px]">Assigned Position</span>
                  <span className="font-semibold text-zinc-900 text-sm mt-0.5 block truncate">
                    {values.position || 'Branch Staff'}
                  </span>
                </div>
                <div className="rounded-xl border border-zinc-200/80 bg-white/90 p-3">
                  <span className="text-zinc-500 block text-[11px]">Contact Email</span>
                  <span className="font-semibold text-zinc-900 mt-0.5 block truncate">
                    {registeredEmail}
                  </span>
                </div>
                <div className="rounded-xl border border-zinc-200/80 bg-white/90 p-3">
                  <span className="text-zinc-500 block text-[11px]">Official Employee ID</span>
                  <span className="font-medium italic text-amber-700 mt-0.5 block truncate">
                    Pending Manager Allocation
                  </span>
                </div>
              </div>
            </div>

            {/* Lifecycle Timeline */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 text-left shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                  Account Activation Journey
                </p>
                <span className="text-[11px] font-semibold text-gold-700 bg-gold-50 border border-gold-200/60 px-2 py-0.5 rounded-full">
                  Phase 3 of 4 Active
                </span>
              </div>

              <ol className="mt-5 space-y-6 relative before:absolute before:left-[15px] before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-emerald-500 before:via-amber-400 before:to-zinc-200">
                {/* Step 1: Registration Details */}
                <li className="relative flex items-start gap-4">
                  <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
                    <Check className="size-4 stroke-[3]" />
                  </span>
                  <div className="flex-1 pt-0.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-zinc-900">1. Registration Details Submitted</p>
                      <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                        Completed
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Applicant profile registered with Finfine Main Branch records.
                    </p>
                  </div>
                </li>

                {/* Step 2: Email Verification */}
                <li className="relative flex items-start gap-4">
                  <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
                    <Check className="size-4 stroke-[3]" />
                  </span>
                  <div className="flex-1 pt-0.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-zinc-900">2. Email Authenticated</p>
                      <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                        Verified
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Validated ownership of {registeredEmail} via Brevo transactional code.
                    </p>
                  </div>
                </li>

                {/* Step 3: Manager Approval & Employee ID Assignment */}
                <li className="relative flex items-start gap-4">
                  <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white shadow-md ring-4 ring-amber-500/20">
                    <Clock className="size-4 stroke-[2.5]" />
                  </span>
                  <div className="flex-1 pt-0.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-zinc-900">3. Manager Credential Review & Employee ID Allocation</p>
                      <span className="text-[11px] text-amber-800 font-bold bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-300">
                        In Progress
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-600 leading-relaxed">
                      Branch Manager reviews registration details and allocates official BOA Employee ID (e.g. BOA-S012) in the management portal.
                    </p>
                  </div>
                </li>

                {/* Step 4: Account Active */}
                <li className="relative flex items-start gap-4">
                  <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-zinc-200 bg-zinc-50 text-zinc-400">
                    <Lock className="size-3.5" />
                  </span>
                  <div className="flex-1 pt-0.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-zinc-500">4. Account Activation & Staff Access</p>
                      <span className="text-[11px] text-zinc-400 font-medium">Pending Step 3</span>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      Sign in using your assigned Employee ID once your official approval notification arrives.
                    </p>
                  </div>
                </li>
              </ol>
            </div>

            {/* Next Steps & Reassurance Callout */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 flex items-start gap-3">
              <ShieldCheck className="size-5 text-gold-600 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed text-zinc-600">
                <p className="font-semibold text-zinc-900">Important Note for Applicants</p>
                <p className="mt-0.5">
                  You do not need to register again. You will receive an official notification email containing your assigned Employee ID once your account is approved.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-center gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                fullWidth
                onClick={() => navigate(paths.login)}
                className="h-12 rounded-xl font-semibold text-sm"
              >
                Return to Sign In
              </Button>
              <Button
                type="button"
                size="lg"
                fullWidth
                onClick={() =>
                  navigate(paths.accountStatus, {
                    state: {
                      referenceId,
                      email: registeredEmail,
                      justRegistered: referenceId,
                    },
                  })
                }
                className="h-12 rounded-xl bg-ink-950 hover:bg-ink-900 text-white font-semibold text-sm shadow-md transition-all active:scale-[0.99] gap-2"
              >
                <span>Track Registration Status</span>
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
