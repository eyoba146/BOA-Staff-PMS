import { IdCard, MailCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Field, Input } from '@/components/ui';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { AuthLayout } from '@/layouts/AuthLayout';
import { authService } from '@/services/auth.service';
import { toApiError } from '@/services/http/apiClient';
import { paths } from '@/routes/paths';

/**
 * Forgot password — request step only. The reset mechanism (email link, OTP, manager reset)
 * is PENDING STAKEHOLDER VALIDATION (SRS §29 Q22). Response is intentionally generic.
 */
export function ForgotPasswordPage() {
  useDocumentTitle('Forgot password');
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Enter your employee ID or email.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authService.requestPasswordReset(identifier.trim());
      setSent(true);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      description="Enter your employee ID or registered email address."
      footer={
        <Link to={paths.login} className="font-medium text-zinc-900 underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center shadow-card">
          <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <MailCheck className="size-5" aria-hidden />
          </span>
          <p className="mt-3 font-medium text-zinc-900">Request received</p>
          <p className="mt-1 text-[13px] text-zinc-600">
            If an account matches the details provided, password reset instructions will be sent. If you do not receive them, contact the
            branch manager.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-5 rounded-lg border border-zinc-200 bg-white p-5 shadow-card sm:p-6">
          <Alert tone="info">The password reset method is subject to confirmation by the bank.</Alert>
          <Field label="Employee ID or email" error={error ?? undefined} required>
            <Input leftIcon={<IdCard />} autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
          </Field>
          <Button type="submit" size="lg" fullWidth loading={loading}>
            Send reset instructions
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
