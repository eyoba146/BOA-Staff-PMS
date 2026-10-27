import { useState, useEffect, type FormEvent } from 'react';
import type { Campaign, CampaignInput, CampaignStatus } from '@/types';
import { Dialog, Button, Field, Input, Select, Textarea } from '@/components/ui';
import { required, validateForm, hasErrors } from '@/utils/validation';
import { todayISO } from '@/utils/date';
import { Target, Calendar, Percent } from 'lucide-react';

interface CampaignDialogProps {
  open: boolean;
  onClose: () => void;
  campaign?: Campaign | null;
  types: string[];
  onSubmit: (data: CampaignInput) => Promise<void>;
}

export function CampaignDialog({
  open,
  onClose,
  campaign,
  types,
  onSubmit,
}: CampaignDialogProps) {
  const isEditing = Boolean(campaign);

  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [customType, setCustomType] = useState('');
  const [isCustomType, setIsCustomType] = useState(false);
  const [target, setTarget] = useState('');
  const [actual, setActual] = useState('');
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<CampaignStatus>('planned');
  const [description, setDescription] = useState('');

  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (campaign) {
      setName(campaign.name);
      if (types.includes(campaign.type)) {
        setSelectedType(campaign.type);
        setIsCustomType(false);
        setCustomType('');
      } else {
        setSelectedType('__custom__');
        setIsCustomType(true);
        setCustomType(campaign.type);
      }
      setTarget(String(campaign.target));
      setActual(campaign.actual !== null && campaign.actual !== undefined ? String(campaign.actual) : '');
      setStartDate(campaign.startDate);
      setEndDate(campaign.endDate);
      setStatus(campaign.status);
      setDescription(campaign.description || '');
    } else {
      setName('');
      setSelectedType(types[0] || 'Deposit Mobilization');
      setIsCustomType(false);
      setCustomType('');
      setTarget('');
      setActual('');
      setStartDate(todayISO());
      // Default end date to 3 months out
      const d = new Date();
      d.setMonth(d.getMonth() + 3);
      setEndDate(d.toISOString().slice(0, 10));
      setStatus('planned');
      setDescription('');
    }
    setErrors({});
  }, [open, campaign, types]);

  // Live achievement preview
  const numTarget = parseFloat(target);
  const numActual = actual.trim() !== '' ? parseFloat(actual) : null;
  const calculatedAchievement =
    !isNaN(numTarget) && numTarget > 0 && numActual !== null && !isNaN(numActual)
      ? Math.round((numActual / numTarget) * 1000) / 10
      : null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const resolvedType = isCustomType ? customType.trim() : selectedType.trim();

    const errs: Record<string, string | undefined> = validateForm(
      {
        name,
        type: resolvedType,
        target,
        actual,
        startDate,
        endDate,
      },
      {
        name: [required('Campaign Name')],
        type: [required('Campaign Type')],
        target: [
          required('Target / Plan'),
          (v) => (isNaN(Number(v)) || Number(v) <= 0 ? 'Target must be a positive number' : undefined),
        ],
        startDate: [required('Start Date')],
        endDate: [
          required('End Date'),
          (v) => (startDate && v && v < startDate ? 'End date cannot be earlier than start date' : undefined),
        ],
      },
    );

    if (actual.trim() !== '' && (isNaN(Number(actual)) || Number(actual) < 0)) {
      errs.actual = 'Actual result must be a positive number or zero';
    }

    setErrors(errs);
    if (hasErrors(errs)) return;

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        type: resolvedType,
        target: Number(target),
        actual: actual.trim() !== '' ? Number(actual) : null,
        startDate,
        endDate,
        status,
        description: description.trim() || undefined,
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
      title={isEditing ? 'Edit Campaign' : 'Create Branch Campaign'}
      description="Define campaign operational targets, measurable actuals, timelines, and monitoring metrics."
      size="lg"
      busy={submitting}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={submitting}>
            {isEditing ? 'Update Campaign' : 'Create Campaign'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        {/* Campaign Name */}
        <Field label="Campaign Name" error={errors.name} required>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Q4 Deposit Mobilization Sprint, BOA Pay Merchant Drive"
          />
        </Field>

        {/* Campaign Type (Extensible / Customizable) */}
        <div className="space-y-2">
          <Field label="Campaign Type" error={errors.type} required>
            <Select
              value={isCustomType ? '__custom__' : selectedType}
              onChange={(e) => {
                if (e.target.value === '__custom__') {
                  setIsCustomType(true);
                } else {
                  setIsCustomType(false);
                  setSelectedType(e.target.value);
                }
              }}
            >
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
              <option value="__custom__">+ Custom Campaign Type...</option>
            </Select>
          </Field>

          {isCustomType && (
            <div className="pl-1">
              <Input
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                placeholder="Enter custom campaign type name..."
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Target and Actual Inputs */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Branch Target / Plan"
            error={errors.target}
            required
            hint="Numeric volume, count, or ETB"
          >
            <Input
              type="number"
              step="any"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="e.g. 20000000 or 150"
              leftIcon={<Target className="size-4 text-zinc-400" />}
            />
          </Field>

          <Field
            label="Actual Result"
            error={errors.actual}
            hint="Leave blank if not yet entered"
          >
            <Input
              type="number"
              step="any"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              placeholder="e.g. 14500000 or 112"
            />
          </Field>
        </div>

        {/* Calculated Achievement Live Indicator */}
        {calculatedAchievement !== null && (
          <div className="rounded-lg border border-gold-200/90 bg-gold-50/70 p-3 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-gold-950">
              <Percent className="size-3.5 text-gold-700" />
              Calculated Achievement:
            </span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-gold-950">
                {Math.round(calculatedAchievement)}%
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">
                ({calculatedAchievement.toFixed(1)}%)
              </span>
            </div>
          </div>
        )}

        {/* Start Date & End Date */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start Date" error={errors.startDate} required>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              leftIcon={<Calendar className="size-4 text-zinc-400" />}
            />
          </Field>

          <Field label="End Date" error={errors.endDate} required>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              leftIcon={<Calendar className="size-4 text-zinc-400" />}
            />
          </Field>
        </div>

        {/* Status */}
        <Field label="Campaign Operational Status" required>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as CampaignStatus)}
          >
            <option value="planned">Planned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </Field>

        {/* Description */}
        <Field label="Description & Directives (Optional)">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Key operational guidelines, product focus, or incentives..."
          />
        </Field>
      </form>
    </Dialog>
  );
}
