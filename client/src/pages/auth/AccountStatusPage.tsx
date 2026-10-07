import { CheckCircle2, Circle, Clock, IdCard, Search, XCircle } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AccountStatusBadge, Alert, Button, Field, Input } from '@/components/ui';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { AuthLayout } from '@/layouts/AuthLayout';
import { authService } from '@/services/auth.service';
import { toApiError } from '@/services/http/apiClient';
import { paths } from '@/routes/paths';
import type { AccountStatusResult } from '@/types';
import { cn } from '@/utils/cn';
import { formatDateTime } from '@/utils/date';

type StepState = 'done' | 'current' | 'upcoming' | 'failed';

function Timeline({ result }: { result: AccountStatusResult }) {
  const s = result.status;
  const steps: Array<{ label: string; detail: string; state: StepState }> = [
    { label: 'Registration submitted', detail: formatDateTime(result.submittedAt), state: 'done' },
    {
      label: 'Verification',
      detail: 'Method to be confirmed by the bank',
      state: s === 'pending_approval' ? 'current' : s === 'rejected' ? 'done' : 'done',
    },
    {
      label: 'Manager approval',
      detail: s === 'rejected' ? 'Not approved' : s === 'pending_approval' ? 'Awaiting review' : result.decidedAt ? formatDateTime(result.decidedAt) : 'Approved',
      state: s === 'pending_approval' ? 'upcoming' : s === 'rejected' ? 'failed' : 'done',
    },
    {
      label: 'Account active',
      detail: s === 'active' ? 'You can sign in' : s === 'deactivated' ? 'Account currently deactivated' : '—',
      state: s === 'active' ? 'done' : 'upcoming',
    },
  ];
  const icon = (st: StepState) =>
    st === 'done' ? (
      <CheckCircle2 className="size-5 text-emerald-600" />
    ) : st === 'current' ? (
      <Clock className="size-5 text-orange-500" />
    ) : st === 'failed' ? (
      <XCircle className="size-5 text-red-600" />
    ) : (
      <Circle className="size-5 text-zinc-300" />
    );

  return (
    <ol className="space-y-0">
      {steps.map((step, i) => (
        <li key={step.label} className="relative flex gap-3 pb-5 last:pb-0">
          {i < steps.length - 1 && <span className="absolute top-6 left-[9.5px] h-[calc(100%-20px)] w-px bg-zinc-200" aria-hidden />}
          <span className="relative bg-white" aria-hidden>
            {icon(step.state)}
          </span>
          <div>
            <p className={cn('text-sm font-medium', step.state === 'upcoming' ? 'text-zinc-500' : 'text-zinc-900')}>{step.label}</p>
            <p className="text-[13px] text-zinc-500">{step.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** AUTH-03 — Approval status lookup. */
export function AccountStatusPage() {
  useDocumentTitle('Registration status');
  const location = useLocation();
  const state = location.state as { employeeId?: string; justRegistered?: string } | null;

  const [employeeId, setEmployeeId] = useState(state?.employeeId ?? '');
  const [result, setResult] = useState<AccountStatusResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const lookup = async (id: string) => {
    if (!id.trim()) {
      setError('Enter your employee ID.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setResult(await authService.getAccountStatus(id));
    } catch (err) {
      setResult(null);
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (state?.employeeId) void lookup(state.employeeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void lookup(employeeId);
  };

  return (
    <AuthLayout
      title="Registration status"
      description="Check whether your staff account has been approved."
      footer={
        <Link to={paths.login} className="font-medium text-zinc-900 underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      }
    >
      {state?.justRegistered && (
        <Alert tone="success" title="Registration submitted" className="mb-4">
          Reference <span className="font-mono">{state.justRegistered}</span>. The branch manager will review your request.
        </Alert>
      )}

      <form onSubmit={onSubmit} noValidate className="flex items-end gap-2 rounded-lg border border-zinc-200 bg-white p-4 shadow-card">
        <Field label="Employee ID" error={error ?? undefined} className="flex-1">
          <Input leftIcon={<IdCard />} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="e.g. BOA-S009" />
        </Field>
        <Button type="submit" loading={loading} leftIcon={<Search className="size-4" />} className={error ? 'mb-[26px]' : undefined}>
          Check
        </Button>
      </form>

      {result && (
        <section aria-label="Registration result" className="mt-4 rounded-lg border border-zinc-200 bg-white shadow-card">
          <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
            <div>
              <p className="font-semibold text-zinc-900">{result.fullName}</p>
              <p className="text-[13px] text-zinc-500">
                {result.employeeId} · Ref. <span className="font-mono">{result.referenceId}</span>
              </p>
            </div>
            <AccountStatusBadge status={result.status} />
          </div>
          <div className="space-y-4 px-5 py-4">
            <Timeline result={result} />
            {result.status === 'rejected' && (
              <Alert tone="danger" title="Reason provided">
                {result.rejectionReason || 'No reason was provided. Please contact the branch manager.'}
              </Alert>
            )}
            {result.status === 'active' && (
              <Link to={paths.login} className="block">
                <Button fullWidth>Continue to sign in</Button>
              </Link>
            )}
            {result.status === 'pending_approval' && (
              <p className="text-[13px] text-zinc-500">No action needed. Check back later or contact the branch manager.</p>
            )}
          </div>
        </section>
      )}
    </AuthLayout>
  );
}
