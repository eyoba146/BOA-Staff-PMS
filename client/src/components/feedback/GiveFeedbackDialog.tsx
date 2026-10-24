import { useState, useEffect, type FormEvent } from 'react';
import type { CommunicationAudience, CommunicationType, FeedbackInput, Kpi, PerformancePeriod, User } from '@/types';
import { Dialog, Button, Field, Input, Select, Textarea } from '@/components/ui';
import { required, validateForm, hasErrors } from '@/utils/validation';
import { PERIOD_LABELS } from '@/utils/date';
import { Users, User as UserIcon, Send, AlertTriangle, Bell, Award, MessageSquare, Lock } from 'lucide-react';

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
  const [recipientMode, setRecipientMode] = useState<'individual' | 'all'>('individual');
  const [staffId, setStaffId] = useState(defaultStaffId ?? '');
  const [commType, setCommType] = useState<CommunicationType>('feedback');
  const [audience, setAudience] = useState<CommunicationAudience>('recipient_only');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [suggestedAction, setSuggestedAction] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [period, setPeriod] = useState<PerformancePeriod | ''>(defaultPeriod ?? '');
  const [periodLabel, setPeriodLabel] = useState(defaultPeriodLabel ?? '');
  const [kpiId, setKpiId] = useState(defaultKpiId ?? '');

  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (defaultStaffId && defaultStaffId !== 'all') {
      setRecipientMode('individual');
      setStaffId(defaultStaffId);
    } else if (staffList.length > 0 && !staffId) {
      setStaffId(staffList[0].id);
    }

    setCommType('feedback');
    setAudience('recipient_only');
    setPeriod(defaultPeriod ?? '');
    setPeriodLabel(defaultPeriodLabel ?? '');
    setKpiId(defaultKpiId ?? '');
    setSubject('');
    setMessage('');
    setSuggestedAction('');
    setFollowUpDate('');
    setErrors({});
  }, [open, defaultStaffId, defaultPeriod, defaultPeriodLabel, defaultKpiId, staffList]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const targetStaffId = recipientMode === 'all' ? 'all' : staffId;

    const errs = validateForm(
      { staffId: targetStaffId, subject, message },
      {
        staffId: [required('Recipient')],
        subject: [required('Subject')],
        message: [required('Message content')],
      },
    );

    setErrors(errs);
    if (hasErrors(errs)) return;

    setSubmitting(true);
    try {
      await onSubmit({
        staffId: targetStaffId,
        recipientType: recipientMode,
        type: commType,
        audience,
        subject: subject.trim(),
        message: message.trim(),
        suggestedAction: suggestedAction.trim() || undefined,
        followUpDate: followUpDate || undefined,
        period: (period as PerformancePeriod) || null,
        periodLabel: periodLabel.trim() || (period ? PERIOD_LABELS[period as PerformancePeriod] : null),
        kpiId: kpiId || null,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const typeConfig: Record<CommunicationType, { label: string; icon: typeof MessageSquare; tone: 'warning' | 'info' | 'danger' | 'success' }> = {
    feedback: { label: 'Feedback', icon: MessageSquare, tone: 'warning' },
    reminder: { label: 'Reminder', icon: Bell, tone: 'info' },
    warning: { label: 'Warning', icon: AlertTriangle, tone: 'danger' },
    appreciation: { label: 'Appreciation', icon: Award, tone: 'success' },
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Branch Communication & Performance Record"
      description="Record official feedback, reminders, warnings, or commendations with in-app & transactional email delivery."
      size="md"
      busy={submitting}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={submitting}
            leftIcon={<Send className="size-4" />}
          >
            {submitting ? 'Sending & Recording...' : 'Send & Record'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        {/* Recipient Selection Mode */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-900">Recipient Selection</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRecipientMode('individual')}
              className={`flex items-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-all ${
                recipientMode === 'individual'
                  ? 'border-gold-500 bg-gold-50/60 text-gold-950 ring-1 ring-gold-500'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              <UserIcon className="size-4 shrink-0 text-zinc-500" />
              <span>Individual Employee</span>
            </button>
            <button
              type="button"
              onClick={() => setRecipientMode('all')}
              className={`flex items-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-all ${
                recipientMode === 'all'
                  ? 'border-gold-500 bg-gold-50/60 text-gold-950 ring-1 ring-gold-500'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              <Users className="size-4 shrink-0 text-zinc-500" />
              <span>All Staff Members ({staffList.length})</span>
            </button>
          </div>
        </div>

        {/* Individual Staff Selector */}
        {recipientMode === 'individual' && (
          <Field label="Designated Staff Member" error={errors.staffId} required>
            <Select value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              <option value="">Select staff member...</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.employeeId || 'ID Pending'} · {s.position})
                </option>
              ))}
            </Select>
          </Field>
        )}

        {/* Communication Type Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-900">Communication Type</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['feedback', 'reminder', 'warning', 'appreciation'] as CommunicationType[]).map((t) => {
              const cfg = typeConfig[t];
              const Icon = cfg.icon;
              const isSelected = commType === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setCommType(t)}
                  className={`flex flex-col items-center justify-center gap-1 rounded-lg border py-2.5 px-2 text-xs font-medium transition-all ${
                    isSelected
                      ? 'border-zinc-900 bg-zinc-900 text-white shadow-xs'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <Icon className={`size-4 ${isSelected ? 'text-gold-400' : 'text-zinc-500'}`} />
                  <span>{cfg.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Audience Selector */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Notification Audience">
            <Select
              value={audience}
              onChange={(e) => setAudience(e.target.value as CommunicationAudience)}
            >
              <option value="recipient_only">Recipient only (Default)</option>
              <option value="recipient_and_manager">Recipient & Branch Manager</option>
            </Select>
          </Field>

          <Field label="Related KPI (Optional)">
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

        {/* Subject */}
        <Field label="Subject Line" error={errors.subject} required>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Daily submission consistency, Loan recovery notice, Stellar customer rating"
          />
        </Field>

        {/* Message */}
        <Field label="Message & Official Observations" error={errors.message} required>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Write official message, specific performance observations, required corrective actions, or appreciation note..."
          />
        </Field>

        {/* Suggested Action and Follow Up Date for Coaching */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Suggested Improvement Action (Optional)">
            <Input
              value={suggestedAction}
              onChange={(e) => setSuggestedAction(e.target.value)}
              placeholder="e.g. Conduct daily teller audit review"
            />
          </Field>
          <Field label="Follow-Up Target Date (Optional)">
            <Input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
            />
          </Field>
        </div>

        <div className="rounded-lg border border-zinc-200/80 bg-zinc-50/80 p-3 text-[11.5px] text-zinc-500 flex items-start gap-2">
          <Lock className="size-3.5 text-zinc-700 mt-0.5 shrink-0" />
          <span>
            {recipientMode === 'all'
              ? 'This communication will be securely dispatched to each individual employee with in-app alert and transactional email delivery.'
              : 'This communication is strictly confidential to the selected employee and branch management records.'}
          </span>
        </div>
      </form>
    </Dialog>
  );
}
