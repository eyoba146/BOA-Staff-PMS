import { Eye, EyeOff, IdCard, KeyRound, LogIn } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Checkbox, Field, Input } from '@/components/ui';
import { env } from '@/config/env';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { AuthLayout } from '@/layouts/AuthLayout';
import { toApiError } from '@/services/http/apiClient';
import { homeFor, paths } from '@/routes/paths';
import { hasErrors, required, validateForm } from '@/utils/validation';

const DEMO_ACCOUNTS = [
  { id: 'BOA-M001', label: 'Branch Manager' },
  { id: 'BOA-S001', label: 'Staff member' },
];

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
  const [formError, setFormError] = useState<{ code: string; message: string } | null>(null);
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
      setFormError({ code: apiErr.code, message: apiErr.message });
    } finally {
      setSubmitting(false);
    }
  };

  const showStatusLink = formError && ['ACCOUNT_PENDING', 'ACCOUNT_REJECTED'].includes(formError.code);

  return (
    <AuthLayout
      title="Sign in"
      description="Use your employee ID and password to access the system."
      footer={
        <>
          New staff member?{' '}
          <Link to={paths.register} className="font-medium text-zinc-900 underline-offset-4 hover:underline">
            Request an account
          </Link>
          <span className="mx-2 text-zinc-300">·</span>
          <Link to={paths.accountStatus} className="font-medium text-zinc-900 underline-offset-4 hover:underline">
            Check registration status
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5 rounded-lg border border-zinc-200 bg-white p-5 shadow-card sm:p-6">
        {sessionNotice && !formError && <Alert tone="warning">{sessionNotice}</Alert>}
        {formError && (
          <Alert
            tone="danger"
            action={
              showStatusLink ? (
                <Link to={paths.accountStatus} className="text-[13px] font-medium underline underline-offset-2">
                  View status
                </Link>
              ) : undefined
            }
          >
            {formError.message}
          </Alert>
        )}

        <Field label="Employee ID or username" error={errors.identifier} required>
          <Input
            name="identifier"
            autoComplete="username"
            autoFocus
            leftIcon={<IdCard />}
            placeholder="e.g. BOA-S001"
            value={values.identifier}
            onChange={(e) => setValues((v) => ({ ...v, identifier: e.target.value }))}
          />
        </Field>

        <Field
          label="Password"
          error={errors.password}
          required
          labelAction={
            <Link to={paths.forgotPassword} className="text-[13px] font-medium text-zinc-600 hover:text-zinc-900 hover:underline">
              Forgot password?
            </Link>
          }
        >
          <Input
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            leftIcon={<KeyRound />}
            value={values.password}
            onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
            suffix={
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="rounded p-0.5 text-zinc-500 hover:text-zinc-800"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            }
          />
        </Field>

        <Checkbox
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          label="Keep me signed in on this device"
          description="Only on personal or approved workstations, if permitted by bank policy."
        />

        <Button type="submit" size="lg" fullWidth loading={submitting} leftIcon={<LogIn className="size-4" />}>
          Sign in
        </Button>
      </form>

      {env.useMockApi && (
        <div className="mt-4 rounded-lg border border-dashed border-violet-300 bg-violet-50/60 p-4 text-[13px] text-violet-900">
          <p className="font-medium">Demo accounts (mock mode only)</p>
          <p className="mt-0.5 text-violet-800/80">
            Password for all demo accounts: <code className="rounded bg-white px-1 py-0.5 font-mono text-xs">Demo@1234</code>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setValues({ identifier: a.id, password: 'Demo@1234' })}
                className="rounded-md border border-violet-200 bg-white px-2.5 py-1.5 text-xs font-medium text-violet-800 hover:border-violet-300 hover:bg-violet-50"
              >
                {a.label} · {a.id}
              </button>
            ))}
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
