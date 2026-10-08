import { Check, CheckCircle2, Circle, Clock, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthStepIndicator } from '@/components/auth/AuthStepIndicator';
import { PositionSelect } from '@/components/auth/PositionSelect';
import { VerificationCodeForm } from '@/components/auth/VerificationCodeForm';
import { Alert, Button, Checkbox, Field, Input } from '@/components/ui';
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
    demoCode?: string;
  } | null;

  const initialStep: RegisterStep =
    navState?.step || (searchParams.get('step') === 'verify' ? 'verify' : 'form');

  const [step, setStep] = useState<RegisterStep>(initialStep);
  const [values, setValues] = useState<Values>(initialValues);
  const [declared, setDeclared] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Verification metadata
  const [registeredEmail, setRegisteredEmail] = useState(
    navState?.email || searchParams.get('email') || '',
  );
  const [referenceId, setReferenceId] = useState(navState?.referenceId || '');
  const [demoCode, setDemoCode] = useState(navState?.demoCode || '123456');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (navState?.email) setRegisteredEmail(navState.email);
    if (navState?.referenceId) setReferenceId(navState.referenceId);
    if (navState?.demoCode) setDemoCode(navState.demoCode);
  }, [navState]);

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
    if (hasErrors(errs)) return;

    setSubmitting(true);
    try {
      const { password, ...rest } = values;
      const res = await authService.register({ ...rest, password });
      setReferenceId(res.referenceId);
      setRegisteredEmail(res.email);
      if (res.demoCode) setDemoCode(res.demoCode);
      setStep('verify');
    } catch (err) {
      const apiErr = toApiError(err);
      setFormError(apiErr.message);
      if (apiErr.fieldErrors) setErrors((prev) => ({ ...prev, ...apiErr.fieldErrors }));
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2: Verify Code
  const handleVerifyEmail = async (code: string) => {
    const res = await authService.verifyEmail({
      email: registeredEmail,
      code,
    });
    setReferenceId(res.referenceId);
    setStep('pending-approval');
  };

  // Step 2: Resend Code
  const handleResendCode = async () => {
    const res = await authService.resendEmailCode({
      email: registeredEmail,
    });
    if (res.demoCode) setDemoCode(res.demoCode);
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

            {formError && <Alert tone="danger">{formError}</Alert>}

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
        {step === 'verify' && (
          <VerificationCodeForm
            title="Verify your email"
            subtitle="A 6-digit verification code has been sent to your registered email address. Complete verification to submit your account for branch manager approval."
            email={registeredEmail}
            demoCode={demoCode}
            verifyButtonLabel="Verify Email & Continue"
            backLabel="Review registration details"
            onVerify={handleVerifyEmail}
            onResend={handleResendCode}
            onBack={() => setStep('form')}
          />
        )}

        {/* STEP 3: Email Verified & Pending Manager Approval */}
        {step === 'pending-approval' && (
          <div className="space-y-6 text-center sm:text-left py-2">
            <div className="flex flex-col sm:flex-row items-center gap-4 border-b border-zinc-100 pb-6">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-xs">
                <CheckCircle2 className="size-8" aria-hidden />
              </div>
              <div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    <Check className="size-3 stroke-[3]" />
                    Email Verified
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-800">
                    <Clock className="size-3" />
                    Manager Approval Pending
                  </span>
                </div>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-950">Email verified successfully</h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Your email has been verified. Your account is now in the branch manager&apos;s review queue.
                </p>
              </div>
            </div>

            {/* Reference ID card */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Registration Reference</span>
                <span className="font-mono text-sm font-bold text-zinc-900 bg-white px-2.5 py-1 rounded-md border border-zinc-200">
                  {referenceId || 'REG-PENDING'}
                </span>
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed text-left">
                Keep this reference ID for tracking. Your Branch Manager will assign your official Employee ID upon reviewing and approving your account.
              </p>
            </div>

            {/* Lifecycle Timeline */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5 text-left">
              <p className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-4">Account Activation Lifecycle</p>
              <ol className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-xs">
                    <Check className="size-3.5 stroke-[2.5]" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-zinc-900">Registration details submitted</p>
                    <p className="text-[11px] text-zinc-500">Position: {values.position || 'Approved Position'}</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-xs">
                    <Check className="size-3.5 stroke-[2.5]" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-zinc-900">Email verified</p>
                    <p className="text-[11px] text-zinc-500">{registeredEmail}</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white text-xs font-bold">
                    <Clock className="size-3.5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-zinc-900">Manager review & Employee ID assignment</p>
                    <p className="text-[11px] text-orange-700 font-medium">In queue for Branch Manager review and Employee ID allocation</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-zinc-400 text-xs">
                    4
                  </span>
                  <div>
                    <p className="text-xs font-medium text-zinc-400">Account activated & platform access</p>
                    <p className="text-[11px] text-zinc-400">Sign in with your assigned Employee ID once approved</p>
                  </div>
                </li>
              </ol>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
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
                className="h-12 rounded-xl bg-ink-950 hover:bg-ink-900 text-white font-semibold text-sm shadow-md transition-all active:scale-[0.99]"
              >
                View Registration Status
              </Button>
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
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
