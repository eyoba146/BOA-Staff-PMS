import { Check, Circle } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Button, Checkbox, Field, Input } from '@/components/ui';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { AuthLayout } from '@/layouts/AuthLayout';
import { authService } from '@/services/auth.service';
import { toApiError } from '@/services/http/apiClient';
import { paths } from '@/routes/paths';
import { cn } from '@/utils/cn';
import {
  email,
  employeeId,
  hasErrors,
  minLength,
  PASSWORD_RULES,
  phone,
  required,
  strongPassword,
  validateForm,
  type Validator,
} from '@/utils/validation';

type Values = {
  fullName: string;
  employeeId: string;
  position: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};
type Errors = Partial<Record<keyof Values | 'declaration', string>>;

const initial: Values = { fullName: '', employeeId: '', position: '', email: '', phone: '', password: '', confirmPassword: '' };

function Section({ title, step, children }: { title: string; step: number; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-4 flex items-center gap-2.5 text-sm font-semibold text-zinc-900">
        <span className="flex size-6 items-center justify-center rounded-full bg-ink-900 text-xs text-white">{step}</span>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

/**
 * AUTH-02 — Staff registration. Mandatory fields follow SRS AUTH-02; the exact list is
 * PENDING STAKEHOLDER VALIDATION (SRS §29 Q14). Branch is fixed (single-branch system).
 */
export function RegisterPage() {
  useDocumentTitle('Request an account');
  const navigate = useNavigate();
  const [values, setValues] = useState<Values>(initial);
  const [declared, setDeclared] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof Values) => (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [key]: e.target.value }));

  const matches: Validator = (v) => (v === values.password ? undefined : 'Passwords do not match.');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Errors = validateForm(values, {
      fullName: [required('Full name'), minLength(3, 'Full name')],
      employeeId: [required('Employee ID'), employeeId],
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
      navigate(paths.accountStatus, { state: { employeeId: values.employeeId.trim().toUpperCase(), justRegistered: res.referenceId } });
    } catch (err) {
      const apiErr = toApiError(err);
      setFormError(apiErr.message);
      if (apiErr.fieldErrors) setErrors((prev) => ({ ...prev, ...apiErr.fieldErrors }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      wide
      title="Request a staff account"
      description="Submit your details. The branch manager will review and approve your account."
      footer={
        <>
          Already have an account?{' '}
          <Link to={paths.login} className="font-medium text-zinc-900 underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-8 rounded-lg border border-zinc-200 bg-white p-5 shadow-card sm:p-7">
        {formError && <Alert tone="danger">{formError}</Alert>}

        <Section step={1} title="Personal information">
          <Field label="Full name" error={errors.fullName} required>
            <Input autoComplete="name" value={values.fullName} onChange={set('fullName')} placeholder="First, father's and grandfather's name" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email address" error={errors.email} required>
              <Input type="email" autoComplete="email" value={values.email} onChange={set('email')} />
            </Field>
            <Field label="Phone number" error={errors.phone} required>
              <Input type="tel" autoComplete="tel" value={values.phone} onChange={set('phone')} placeholder="09XX XXX XXX" />
            </Field>
          </div>
        </Section>

        <Section step={2} title="Employment details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Employee ID" error={errors.employeeId} required hint="As issued by the bank.">
              <Input value={values.employeeId} onChange={set('employeeId')} autoComplete="off" />
            </Field>
            <Field label="Position" error={errors.position} required hint="Your current job title at the branch.">
              <Input value={values.position} onChange={set('position')} />
            </Field>
          </div>
        </Section>

        <Section step={3} title="Account security">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Password" error={errors.password} required>
              <Input type="password" autoComplete="new-password" value={values.password} onChange={set('password')} />
            </Field>
            <Field label="Confirm password" error={errors.confirmPassword} required>
              <Input type="password" autoComplete="new-password" value={values.confirmPassword} onChange={set('confirmPassword')} />
            </Field>
          </div>
          <ul className="grid gap-1.5 text-[13px] sm:grid-cols-2" aria-label="Password requirements">
            {PASSWORD_RULES.map((rule) => {
              const ok = rule.test(values.password);
              return (
                <li key={rule.id} className={cn('flex items-center gap-2', ok ? 'text-emerald-700' : 'text-zinc-500')}>
                  {ok ? <Check className="size-3.5" aria-hidden /> : <Circle className="size-3" aria-hidden />}
                  {rule.label}
                  <span className="sr-only">{ok ? '(met)' : '(not met)'}</span>
                </li>
              );
            })}
          </ul>
        </Section>

        <div className="space-y-2 border-t border-zinc-100 pt-6">
          <Checkbox
            checked={declared}
            onChange={(e) => setDeclared(e.target.checked)}
            invalid={!!errors.declaration}
            label="I confirm the information above is accurate and that I am an employee of this branch."
          />
          {errors.declaration && (
            <p role="alert" className="pl-6.5 text-[13px] text-red-700">
              {errors.declaration}
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-zinc-500">Your account will remain inactive until approved.</p>
          <Button type="submit" size="lg" loading={submitting}>
            Submit registration
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}
