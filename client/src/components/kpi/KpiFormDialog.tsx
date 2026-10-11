import { useState, useEffect, type FormEvent } from 'react';
import type { Kpi, KpiFrequency, KpiInput, KpiValueType, RuleStatus } from '@/types';
import { Dialog, Button, Field, Input, Select, Textarea, Checkbox } from '@/components/ui';
import { required, nonNegativeNumber, validateForm, hasErrors } from '@/utils/validation';
import { Calculator, Sparkles, HelpCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

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

type FormulaPresetId = 'standard' | 'capped' | 'inverse' | 'binary' | 'custom';

interface FormulaPreset {
  id: FormulaPresetId;
  label: string;
  badge: string;
  formula: string;
  description: string;
  example: (target: number) => { actual: number; score: number; explanation: string };
}

const FORMULA_PRESETS: FormulaPreset[] = [
  {
    id: 'standard',
    label: 'Standard Attainment (Higher is Better)',
    badge: 'Standard Banking Volume',
    formula: '(Actual ÷ Target) × 100%',
    description: 'Measures standard operational volume. Exceeding the target yields over 100% score.',
    example: (tgt) => {
      const actual = Math.round(tgt * 1.2 * 10) / 10;
      return {
        actual,
        score: Math.round((actual / (tgt || 1)) * 100),
        explanation: `Staff achieved ${actual} against target ${tgt}, achieving 120% attainment.`,
      };
    },
  },
  {
    id: 'capped',
    label: 'Capped Attainment (Max 100%)',
    badge: 'Fixed Quotas & Mandates',
    formula: 'Min((Actual ÷ Target) × 100%, 100%)',
    description: 'Caps attainment score at 100%. Over-performance is recognized but does not exceed the ceiling.',
    example: (tgt) => {
      const actual = Math.round(tgt * 1.5 * 10) / 10;
      return {
        actual,
        score: 100,
        explanation: `Staff recorded ${actual} against target ${tgt}. Attainment capped at 100%.`,
      };
    },
  },
  {
    id: 'inverse',
    label: 'Inverse / Defect Rate (Lower is Better)',
    badge: 'Errors, Wait Times & Discrepancies',
    formula: 'Max(0, 100% - ((Actual - Target) ÷ Target) × 100%)',
    description: 'Staff receives 100% if actual is within target threshold; performance drops if errors exceed target.',
    example: (tgt) => {
      const actual = Math.max(0, tgt - 1);
      return {
        actual,
        score: 100,
        explanation: `Zero or fewer errors than threshold ${tgt} grants 100% compliance.`,
      };
    },
  },
  {
    id: 'binary',
    label: 'Milestone / Compliance (Pass / Fail)',
    badge: 'Yes/No Checklist & Reconciliation',
    formula: 'Actual ≥ Target ? 100% : 0%',
    description: 'Binary pass/fail metric (e.g. daily branch till balancing, vault verification).',
    example: (tgt) => ({
      actual: tgt,
      score: 100,
      explanation: `Meeting or completing target ${tgt} awards full 100% completion.`,
    }),
  },
  {
    id: 'custom',
    label: 'Custom Banking Formula',
    badge: 'Advanced Arithmetic',
    formula: 'Custom expression',
    description: 'Manually specify custom arithmetic rules for bespoke branch products or ratios.',
    example: () => ({
      actual: 10,
      score: 100,
      explanation: 'Evaluated according to custom rule expression.',
    }),
  },
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
  const [selectedPreset, setSelectedPreset] = useState<FormulaPresetId>('standard');
  const [calculationRule, setCalculationRule] = useState('');
  const [ruleStatus, setRuleStatus] = useState<RuleStatus>('approved');
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
      setRuleStatus(kpi.ruleStatus);
      setIsActive(kpi.isActive);

      const existingRule = kpi.calculationRule ?? '';
      setCalculationRule(existingRule);

      // Auto-detect preset
      if (existingRule.includes('Min(') || existingRule.includes('Capped')) {
        setSelectedPreset('capped');
      } else if (existingRule.includes('Inverse') || existingRule.includes('Defect')) {
        setSelectedPreset('inverse');
      } else if (existingRule.includes('Milestone') || existingRule.includes('Binary') || existingRule.includes('Pass')) {
        setSelectedPreset('binary');
      } else if (existingRule.includes('(Actual ÷ Target)')) {
        setSelectedPreset('standard');
      } else if (existingRule.trim()) {
        setSelectedPreset('custom');
      } else {
        setSelectedPreset('standard');
      }
    } else {
      setName('');
      setDescription('');
      setUnit('items');
      setValueType('integer');
      setTarget('10');
      setFrequency('daily');
      setWeight('');
      setSelectedPreset('standard');
      setCalculationRule('(Actual ÷ Target) × 100%');
      setRuleStatus('approved');
      setIsActive(true);
    }
    setErrors({});
  }, [kpi, open]);

  const handleSelectPreset = (presetId: FormulaPresetId) => {
    setSelectedPreset(presetId);
    const found = FORMULA_PRESETS.find((p) => p.id === presetId);
    if (found && presetId !== 'custom') {
      setCalculationRule(found.formula);
    }
  };

  const handleInsertToken = (token: string) => {
    setCalculationRule((prev) => `${prev} ${token}`.trim());
  };

  const currentPresetMeta = FORMULA_PRESETS.find((p) => p.id === selectedPreset) || FORMULA_PRESETS[0];
  const targetNum = Number(target) || 10;
  const sim = currentPresetMeta.example(targetNum);

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
        calculationRule: calculationRule.trim() || currentPresetMeta.formula,
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
              placeholder="e.g. items, ETB, accounts"
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

        {/* --- UX Overhaul: Formula Preset Selector & Simulator --- */}
        <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="size-4 text-gold-600" />
              <label className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                Calculation Method & Attainment Rule
              </label>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500">
              <Sparkles className="size-3 text-gold-500" /> Preset Formula Builder
            </span>
          </div>

          <p className="text-xs text-zinc-500">
            Select how staff attainment is calculated. You do not need to memorize formula syntax or variable names.
          </p>

          {/* Preset Buttons Grid */}
          <div className="grid gap-2 sm:grid-cols-2">
            {FORMULA_PRESETS.map((preset) => {
              const isSelected = selectedPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset.id)}
                  className={cn(
                    'flex flex-col items-start rounded-md border p-2.5 text-left transition-all cursor-pointer',
                    isSelected
                      ? 'border-gold-500 bg-white shadow-xs ring-1 ring-gold-500/30'
                      : 'border-zinc-200 bg-white/70 hover:border-zinc-300 hover:bg-white',
                  )}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-900">{preset.label}</span>
                    {isSelected && (
                      <span className="rounded-full bg-gold-500/20 px-1.5 py-0.2 text-[9px] font-bold text-gold-800">
                        Selected
                      </span>
                    )}
                  </div>
                  <span className="mt-1 font-mono text-[11px] font-semibold text-gold-700">
                    {preset.formula}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Custom formula manual editing if 'custom' selected */}
          {selectedPreset === 'custom' && (
            <div className="space-y-2 pt-2 border-t border-zinc-200">
              <Field
                label="Custom Rule Expression"
                hint="Click quick tokens below to insert variables into your expression."
              >
                <Input
                  value={calculationRule}
                  onChange={(e) => setCalculationRule(e.target.value)}
                  placeholder="e.g. (Actual ÷ Target) × Weight"
                />
              </Field>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[11px] font-medium text-zinc-500">Insert variables:</span>
                {['Actual', 'Target', 'Weight', 'Min(Actual, Target)', '100%'].map((tok) => (
                  <button
                    key={tok}
                    type="button"
                    onClick={() => handleInsertToken(tok)}
                    className="rounded bg-zinc-200 px-2 py-0.5 text-[11px] font-mono text-zinc-700 hover:bg-gold-100 hover:text-gold-900 transition-colors cursor-pointer"
                  >
                    +{tok}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Live Mathematical Preview Card */}
          <div className="rounded-lg border border-gold-300/70 bg-gradient-to-br from-gold-50/90 via-amber-50/40 to-white p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-800">
                <HelpCircle className="size-3.5 text-gold-600" /> Live Attainment Simulation
              </span>
              <span className="rounded bg-white px-2 py-0.5 text-[10px] font-mono font-bold text-zinc-700 border border-zinc-200">
                {currentPresetMeta.badge}
              </span>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              {currentPresetMeta.description}
            </p>

            <div className="grid grid-cols-3 gap-2 rounded-md border border-gold-200/60 bg-white/90 p-2.5 text-center text-xs">
              <div>
                <span className="text-[10px] font-semibold uppercase text-zinc-400 block">Baseline Target</span>
                <span className="font-mono font-bold text-zinc-800">{targetNum} {unit}</span>
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase text-zinc-400 block">Sample Actual</span>
                <span className="font-mono font-bold text-zinc-800">{sim.actual} {unit}</span>
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase text-zinc-400 block">Simulated Score</span>
                <span className="font-mono font-bold text-emerald-600 text-sm">{sim.score}%</span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 italic">
              Example outcome: {sim.explanation}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-zinc-100">
          <Field label="Rule Approval Status">
            <Select value={ruleStatus} onChange={(e) => setRuleStatus(e.target.value as RuleStatus)}>
              <option value="approved">Approved by Branch Management</option>
              <option value="pending_validation">Pending Validation (Draft / Demonstration)</option>
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
