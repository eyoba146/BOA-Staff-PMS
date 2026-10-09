import { Eye, EyeOff, IdCard, KeyRound, LogIn, Lock } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Checkbox, Field, Input } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { AuthLayout } from '@/layouts/AuthLayout';
import { toApiError } from '@/services/http/apiClient';
import { homeFor, paths } from '@/routes/paths';
import { hasErrors, required, validateForm } from '@/utils/validation';

/** AUTH-01 — Login */
export function LoginPage() {
  useDocumentTitle('Sign in');
  const { login, sessionNotice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [values, setValues] = useState({ identifier: '', password: '' });
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<'identifier' | 'password', string>>>({});
  const [formError, setFormError] = useState<{
    code: string;
    message: string;
    fieldErrors?: Record<string, string>;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validateForm(values, {
      identifier: [required('Employee ID or username')],
      password: [required('Password')],
    });
    setErrors(errs);
    setFormError(null);
    if (hasErrors(errs)) return;

    setSubmitting(true);
    try {
      const user = await login({ ...values, remember });
      const target = from && from.startsWith(`/${user.role}`) ? from : homeFor(user.role);
      navigate(target, { replace: true });
    } catch (err) {
      const apiErr = toApiError(err);
      setFormError({
        code: apiErr.code,
        message: apiErr.message,
        fieldErrors: apiErr.fieldErrors,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const showStatusLink = formError && ['ACCOUNT_PENDING', 'ACCOUNT_REJECTED'].includes(formError.code);
  const unverifiedEmail =
    formError?.fieldErrors?.email ||
    (values.identifier.includes('@') ? values.identifier.trim() : '');

  return (
    <AuthLayout
      footer={
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-600">
            <span>New branch staff member?</span>
            <Link to={paths.register} className="font-semibold text-zinc-900 underline-offset-4 hover:text-gold-700 hover:underline">
              Request an account
            </Link>
            <span className="text-zinc-300">·</span>
            <Link to={paths.accountStatus} className="font-semibold text-zinc-900 underline-offset-4 hover:text-gold-700 hover:underline">
              Check registration status
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

        {/* Integrated Luxury Card Header with Official BoA Logo */}
        <div className="relative flex items-center justify-between border-b border-zinc-100 pb-5">
          <div className="flex items-center gap-3.5">
            <img
              src="/abyssinia-logo.png"
              alt="Bank of Abyssinia"
              className="h-12 w-auto shrink-0 object-contain"
            />
            <div>
              <p className="text-[11.5px] font-bold tracking-wider text-zinc-400 uppercase">Bank of Abyssinia</p>
              <p className="text-[14.5px] font-semibold text-zinc-900">Branch Operations Portal</p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-800">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Terminal Online
          </span>
        </div>

        {/* Headline */}
        <div className="mt-5">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-[25px]">Staff Workstation Sign In</h1>
          <p className="mt-1 text-[13.5px] text-zinc-500 leading-relaxed">
            Enter your official branch credentials to access operational performance records.
          </p>
        </div>

        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4.5">
          {sessionNotice && !formError && <Alert tone="warning">{sessionNotice}</Alert>}
          {formError && (
            <Alert
              tone={formError.code === 'EMAIL_NOT_VERIFIED' ? 'warning' : 'danger'}
              action={
                formError.code === 'EMAIL_NOT_VERIFIED' ? (
                  <Link
                    to={`${paths.register}?step=verify${unverifiedEmail ? `&email=${encodeURIComponent(unverifiedEmail)}` : ''}`}
                    state={{
                      step: 'verify',
                      email: unverifiedEmail,
                      referenceId: formError.fieldErrors?.referenceId,
                    }}
                    className="text-[13px] font-semibold underline underline-offset-2 hover:text-zinc-950"
                  >
                    Verify email now
                  </Link>
                ) : showStatusLink ? (
                  <Link
                    to={paths.accountStatus}
                    state={{ employeeId: values.identifier, email: formError.fieldErrors?.email }}
                    className="text-[13px] font-medium underline underline-offset-2"
                  >
                    View status
                  </Link>
                ) : undefined
              }
            >
              {formError.message}
            </Alert>
          )}

          <Field label="Employee ID or Username" error={errors.identifier} required>
            <Input
              name="identifier"
              autoComplete="username"
              autoFocus
              leftIcon={<IdCard className="size-4 text-zinc-400" />}
              placeholder="e.g. BOA-M001 or BOA-S001"
              value={values.identifier}
              onChange={(e) => setValues((v) => ({ ...v, identifier: e.target.value }))}
              className="h-12 rounded-xl border-zinc-200/90 bg-zinc-50/50 text-sm focus:bg-white focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20"
            />
          </Field>

          <Field
            label="Password"
            error={errors.password}
            required
            labelAction={
              <Link to={paths.forgotPassword} className="text-xs font-semibold text-gold-700 hover:text-gold-800 hover:underline">
                Forgot password?
              </Link>
            }
          >
            <Input
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              leftIcon={<KeyRound className="size-4 text-zinc-400" />}
              value={values.password}
              onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
              className="h-12 rounded-xl border-zinc-200/90 bg-zinc-50/50 text-sm focus:bg-white focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20"
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="rounded p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              }
            />
          </Field>

          <div className="pt-0.5">
            <Checkbox
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              label={<span className="font-medium text-zinc-800">Remember this workstation</span>}
              description="Keep my session securely active on approved branch terminals."
            />
          </div>

          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={submitting}
            className="h-12 rounded-xl bg-ink-950 hover:bg-ink-900 text-white font-semibold text-sm shadow-md hover:shadow-xl shadow-ink-950/10 transition-all active:scale-[0.99] gap-2.5 group"
          >
            <LogIn className="size-4 text-gold-400 transition-transform group-hover:translate-x-1" />
            <span>Sign In to Terminal</span>
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}
