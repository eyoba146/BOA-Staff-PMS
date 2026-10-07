import { useState, useEffect, type FormEvent } from 'react';
import type { FeedbackInput, Kpi, PerformancePeriod, User } from '@/types';
import { Dialog, Button, Field, Input, Select, Textarea } from '@/components/ui';
import { required, validateForm, hasErrors } from '@/utils/validation';
import { PERIOD_LABELS } from '@/utils/date';

interface GiveFeedbackDialogProps {
  open: boolean;
  onClose: () => void;
  staffList: User[];
  kpis: Kpi[];
  defaultStaffId?: string;
  defaultPeriod?: PerformancePeriod | null;
  defaultPeriodLabel?: string | null;
  defaultKpiId?: string | null;
  onSubmit: (data: FeedbackInput) => Promise<void>;
}

export function GiveFeedbackDialog({
  open,
  onClose,
  staffList,
  kpis,
  defaultStaffId,
  defaultPeriod,
  defaultPeriodLabel,
  defaultKpiId,
  onSubmit,
}: GiveFeedbackDialogProps) {
  const [staffId, setStaffId] = useState(defaultStaffId ?? '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [period, setPeriod] = useState<PerformancePeriod | ''>(defaultPeriod ?? '');
  const [periodLabel, setPeriodLabel] = useState(defaultPeriodLabel ?? '');
  const [kpiId, setKpiId] = useState(defaultKpiId ?? '');

  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (defaultStaffId) setStaffId(defaultStaffId);
    else if (staffList.length > 0 && !staffId) setStaffId(staffList[0].id);

    setPeriod(defaultPeriod ?? '');
    setPeriodLabel(defaultPeriodLabel ?? '');
    setKpiId(defaultKpiId ?? '');
    setSubject('');
    setMessage('');
    setErrors({});
  }, [open, defaultStaffId, defaultPeriod, defaultPeriodLabel, defaultKpiId, staffList]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validateForm(
      { staffId, subject, message },
      {
        staffId: [required('Staff member')],
        subject: [required('Subject')],
        message: [required('Feedback message')],
      },
    );

    setErrors(errs);
    if (hasErrors(errs)) return;

    setSubmitting(true);
    try {
      await onSubmit({
        staffId,
        subject: subject.trim(),
        message: message.trim(),
        period: (period as PerformancePeriod) || null,
        periodLabel: periodLabel.trim() || (period ? PERIOD_LABELS[period as PerformancePeriod] : null),
        kpiId: kpiId || null,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Provide Management Feedback"
      description="Send performance feedback, guidance, or commendations to a branch staff member."
      size="md"
      busy={submitting}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={submitting}>
            Submit Feedback
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        <Field label="Staff Member" error={errors.staffId} required>
          <Select value={staffId} onChange={(e) => setStaffId(e.target.value)}>
            <option value="">Select staff member...</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName} ({s.employeeId} · {s.position})
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Subject" error={errors.subject} required>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Daily submission consistency, Weekly KPI review"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Related Period (Optional)">
            <Select value={period} onChange={(e) => setPeriod(e.target.value as PerformancePeriod)}>
              <option value="">None</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </Select>
          </Field>

          <Field label="Specific KPI (Optional)">
            <Select value={kpiId} onChange={(e) => setKpiId(e.target.value)}>
              <option value="">General (All assigned)</option>
              {kpis.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Feedback Message" error={errors.message} required>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Write constructive, actionable feedback or recognition..."
          />
        </Field>
      </form>
    </Dialog>
  );
}
