import { useState, useEffect, type FormEvent } from 'react';
import type { Kpi, KpiFrequency, KpiInput, KpiValueType, RuleStatus } from '@/types';
import { Dialog, Button, Field, Input, Select, Textarea, Checkbox, Alert } from '@/components/ui';
import { required, nonNegativeNumber, validateForm, hasErrors } from '@/utils/validation';

interface KpiFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: KpiInput) => Promise<void>;
  kpi?: Kpi | null;
}

const FREQUENCIES: Array<{ value: KpiFrequency; label: string }> = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
];

const VALUE_TYPES: Array<{ value: KpiValueType; label: string }> = [
  { value: 'integer', label: 'Integer (count / items)' },
  { value: 'decimal', label: 'Decimal' },
  { value: 'currency', label: 'Currency (ETB)' },
  { value: 'percentage', label: 'Percentage (%)' },
];

export function KpiFormDialog({ open, onClose, onSubmit, kpi }: KpiFormDialogProps) {
  const isEdit = !!kpi;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('');
  const [valueType, setValueType] = useState<KpiValueType>('integer');
  const [target, setTarget] = useState('10');
  const [frequency, setFrequency] = useState<KpiFrequency>('daily');
  const [weight, setWeight] = useState('');
  const [calculationRule, setCalculationRule] = useState('');
  const [ruleStatus, setRuleStatus] = useState<RuleStatus>('pending_validation');
  const [isActive, setIsActive] = useState(true);

  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (kpi) {
      setName(kpi.name);
      setDescription(kpi.description);
      setUnit(kpi.unit);
      setValueType(kpi.valueType);
      setTarget(String(kpi.target));
      setFrequency(kpi.frequency);
      setWeight(kpi.weight !== null ? String(kpi.weight) : '');
      setCalculationRule(kpi.calculationRule ?? '');
      setRuleStatus(kpi.ruleStatus);
      setIsActive(kpi.isActive);
    } else {
      setName('');
      setDescription('');
      setUnit('items');
      setValueType('integer');
      setTarget('10');
      setFrequency('daily');
      setWeight('');
      setCalculationRule('Conceptual example: (Actual ÷ Target) × 100 — pending management approval');
      setRuleStatus('pending_validation');
      setIsActive(true);
    }
    setErrors({});
  }, [kpi, open]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validateForm(
      { name, unit, target, weight },
      {
        name: [required('KPI Name')],
        unit: [required('Measurement Unit')],
        target: [required('Target value'), nonNegativeNumber({ integer: valueType === 'integer' })],
      },
    );

    if (weight.trim()) {
      const wErr = nonNegativeNumber({ max: 100 })(weight);
      if (wErr) errs.weight = wErr;
    }

    setErrors(errs);
    if (hasErrors(errs)) return;

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        unit: unit.trim(),
        valueType,
        target: Number(target),
        frequency,
        weight: weight.trim() ? Number(weight) : null,
        calculationRule: calculationRule.trim() || null,
        ruleStatus,
        isActive,
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
      title={isEdit ? `Edit KPI — ${kpi?.name}` : 'Create New KPI'}
      description="Define KPI parameters, baseline targets, and assignment frequency."
      size="lg"
      busy={submitting}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={submitting}>
            {isEdit ? 'Save Changes' : 'Create KPI'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        <Alert tone="validation">
          Actual branch KPIs, targets, weights, and calculation formulas must be confirmed and approved by branch management.
        </Alert>

        <Field label="KPI Name" error={errors.name} required>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Daily Accounts Opened, Transaction Volume"
          />
        </Field>

        <Field label="Description" hint="Operational definition and guidelines for staff.">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Provide context on what this KPI measures and how it contributes to branch performance."
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Frequency" required>
            <Select value={frequency} onChange={(e) => setFrequency(e.target.value as KpiFrequency)}>
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Value Type" required>
            <Select value={valueType} onChange={(e) => setValueType(e.target.value as KpiValueType)}>
              {VALUE_TYPES.map((vt) => (
                <option key={vt.value} value={vt.value}>
                  {vt.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Baseline Target" error={errors.target} required>
            <Input
              type="number"
              step={valueType === 'decimal' ? '0.01' : '1'}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              suffix={unit}
            />
          </Field>

          <Field label="Measurement Unit" error={errors.unit} required>
            <Input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g. items, ETB, %"
            />
          </Field>

          <Field label="Weight (%)" error={errors.weight} hint="Optional (0–100)">
            <Input
              type="number"
              min="0"
              max="100"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g. 25"
            />
          </Field>
        </div>

        <Field
          label="Calculation Rule Description"
          hint="Human-readable formula statement until backend calculations are validated."
        >
          <Input
            value={calculationRule}
            onChange={(e) => setCalculationRule(e.target.value)}
            placeholder="Formula description"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-zinc-100">
          <Field label="Rule Approval Status">
            <Select value={ruleStatus} onChange={(e) => setRuleStatus(e.target.value as RuleStatus)}>
              <option value="pending_validation">Pending Validation (Draft / Demonstration)</option>
              <option value="approved">Approved by Branch Management</option>
            </Select>
          </Field>

          <div className="flex items-center pt-6">
            <Checkbox
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              label="Active KPI"
              description="Inactive KPIs will not appear on daily entry forms."
            />
          </div>
        </div>
      </form>
    </Dialog>
  );
}
