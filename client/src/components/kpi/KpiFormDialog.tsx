import { useState, useEffect, type FormEvent } from 'react';
import type { Kpi, KpiFrequency, KpiInput, KpiValueType, RuleStatus } from '@/types';
import { Dialog, Button, Field, Input, Select, Textarea, Checkbox } from '@/components/ui';
import { required, nonNegativeNumber, validateForm, hasErrors } from '@/utils/validation';
import { Calculator, Sparkles, HelpCircle, TableProperties, Wand2 } from 'lucide-react';
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
  { value: 'yearly', label: 'Yearly' },
];

const VALUE_TYPES: Array<{ value: KpiValueType; label: string }> = [
  { value: 'integer', label: 'Integer (count / items / accounts)' },
  { value: 'decimal', label: 'Decimal' },
  { value: 'currency', label: 'Currency (ETB / USD)' },
  { value: 'percentage', label: 'Percentage (%)' },
];

export interface BoaMetricPreset {
  code: string;
  name: string;
  valueType: KpiValueType;
  unit: string;
  quarterly: number;
  monthly: number;
  weekly: number;
  daily: number | null;
  yearly: number;
}

export const BOA_METRIC_PRESETS: BoaMetricPreset[] = [
  { code: '1', name: 'LCY Deposit', valueType: 'currency', unit: 'ETB', quarterly: 17875000, monthly: 5958333, weekly: 1489583, daily: 297917, yearly: 71500000 },
  { code: '2', name: 'IFB Deposit', valueType: 'currency', unit: 'ETB', quarterly: 692308, monthly: 230769, weekly: 57692, daily: 11538, yearly: 2769232 },
  { code: '3', name: 'FCY', valueType: 'currency', unit: 'USD', quarterly: 55797, monthly: 18599, weekly: 4650, daily: 930, yearly: 223188 },
  { code: '3.1', name: 'MTO', valueType: 'currency', unit: 'USD', quarterly: 3500, monthly: 1167, weekly: 292, daily: 58, yearly: 14000 },
  { code: '3.2', name: 'CASH', valueType: 'currency', unit: 'USD', quarterly: 1552, monthly: 517, weekly: 129, daily: 26, yearly: 6208 },
  { code: '3.3', name: 'SWIFT', valueType: 'currency', unit: 'USD', quarterly: 10244, monthly: 3415, weekly: 854, daily: 171, yearly: 40976 },
  { code: '3.4', name: 'CARD', valueType: 'currency', unit: 'USD', quarterly: 501, monthly: 167, weekly: 42, daily: 8, yearly: 2004 },
  { code: '3.5', name: 'EXPORT', valueType: 'currency', unit: 'USD', quarterly: 40000, monthly: 13333, weekly: 3333, daily: null, yearly: 160000 },
  { code: '4', name: 'HVC >1Mln', valueType: 'integer', unit: 'Accounts', quarterly: 12, monthly: 4, weekly: 1, daily: null, yearly: 48 },
  { code: '5', name: 'CB >1,000', valueType: 'integer', unit: 'Accounts', quarterly: 153, monthly: 51, weekly: 13, daily: 3, yearly: 612 },
  { code: '6', name: 'IFB CB', valueType: 'integer', unit: 'Accounts', quarterly: 20, monthly: 7, weekly: 2, daily: null, yearly: 80 },
  { code: '7', name: 'CARD', valueType: 'integer', unit: 'Cards', quarterly: 299, monthly: 100, weekly: 25, daily: 5, yearly: 1196 },
  { code: '8', name: 'MB', valueType: 'integer', unit: 'Subscribers', quarterly: 275, monthly: 92, weekly: 23, daily: 5, yearly: 1100 },
  { code: '9', name: 'AO', valueType: 'decimal', unit: 'Accounts', quarterly: 5, monthly: 2, weekly: 0.4, daily: null, yearly: 20 },
  { code: '10', name: 'MERCHANT', valueType: 'decimal', unit: 'Merchants', quarterly: 5, monthly: 2, weekly: 0.4, daily: null, yearly: 20 },
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
    formula: '(Actual / Target) * 100%',
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
    formula: 'Min((Actual / Target) * 100%, 100%)',
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
    formula: 'Max(0, 100% - ((Actual - Target) / Target) * 100%)',
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
    formula: 'Actual >= Target ? 100% : 0%',
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

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('');
  const [valueType, setValueType] = useState<KpiValueType>('currency');

  // Multi-period targets
  const [dailyTarget, setDailyTarget] = useState('');
  const [weeklyTarget, setWeeklyTarget] = useState('');
  const [monthlyTarget, setMonthlyTarget] = useState('');
  const [quarterlyTarget, setQuarterlyTarget] = useState('');
  const [yearlyTarget, setYearlyTarget] = useState('');

  // Primary baseline frequency and target
  const [frequency, setFrequency] = useState<KpiFrequency>('daily');
  const [target, setTarget] = useState('10');
  const [weight, setWeight] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<FormulaPresetId>('standard');
  const [calculationRule, setCalculationRule] = useState('');
  const [ruleStatus, setRuleStatus] = useState<RuleStatus>('approved');
  const [isActive, setIsActive] = useState(true);

  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (kpi) {
      setCode(kpi.code || '');
      setName(kpi.name);
      setDescription(kpi.description || '');
      setUnit(kpi.unit);
      setValueType(kpi.valueType);
      setTarget(String(kpi.target));
      setFrequency(kpi.frequency);
      setDailyTarget(kpi.dailyTarget !== null && kpi.dailyTarget !== undefined ? String(kpi.dailyTarget) : '');
      setWeeklyTarget(kpi.weeklyTarget !== null && kpi.weeklyTarget !== undefined ? String(kpi.weeklyTarget) : '');
      setMonthlyTarget(kpi.monthlyTarget !== null && kpi.monthlyTarget !== undefined ? String(kpi.monthlyTarget) : '');
      setQuarterlyTarget(kpi.quarterlyTarget !== null && kpi.quarterlyTarget !== undefined ? String(kpi.quarterlyTarget) : '');
      setYearlyTarget(kpi.yearlyTarget !== null && kpi.yearlyTarget !== undefined ? String(kpi.yearlyTarget) : '');
      setWeight(kpi.weight !== null && kpi.weight !== undefined ? String(kpi.weight) : '');
      setRuleStatus(kpi.ruleStatus);
      setIsActive(kpi.isActive);

      const existingRule = kpi.calculationRule ?? '';
      setCalculationRule(existingRule);

      if (existingRule.includes('Min(') || existingRule.includes('Capped')) {
        setSelectedPreset('capped');
      } else if (existingRule.includes('Inverse') || existingRule.includes('Defect')) {
        setSelectedPreset('inverse');
      } else if (existingRule.includes('Milestone') || existingRule.includes('Binary') || existingRule.includes('Pass')) {
        setSelectedPreset('binary');
      } else if (existingRule.includes('Actual / Target') || existingRule.includes('Actual ÷ Target')) {
        setSelectedPreset('standard');
      } else if (existingRule.trim()) {
        setSelectedPreset('custom');
      } else {
        setSelectedPreset('standard');
      }
    } else {
      setCode('');
      setName('');
      setDescription('');
      setUnit('ETB');
      setValueType('currency');
      setDailyTarget('');
      setWeeklyTarget('');
      setMonthlyTarget('');
      setQuarterlyTarget('');
      setYearlyTarget('');
      setTarget('0');
      setFrequency('daily');
      setWeight('');
      setSelectedPreset('standard');
      setCalculationRule('(Actual / Target) * 100%');
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

  const handleApplyBoaPreset = (presetCode: string) => {
    const p = BOA_METRIC_PRESETS.find((x) => x.code === presetCode);
    if (!p) return;
    setCode(p.code);
    setName(p.name);
    setValueType(p.valueType);
    setUnit(p.unit);
    setQuarterlyTarget(String(p.quarterly));
    setMonthlyTarget(String(p.monthly));
    setWeeklyTarget(String(p.weekly));
    setDailyTarget(p.daily !== null ? String(p.daily) : '');
    setYearlyTarget(String(p.yearly));
    setTarget(p.daily !== null ? String(p.daily) : String(p.monthly));
    setFrequency(p.daily !== null ? 'daily' : 'monthly');
    setDescription(`Bank of Abyssinia official performance metric ${p.code} (${p.name}).`);
  };

  const handleAutoDistributeFromQuarterly = () => {
    const q = Number(quarterlyTarget);
    if (!q || isNaN(q) || q <= 0) return;
    const m = Math.round(q / 3);
    const w = Math.round(m / 4);
    const d = Math.round(w / 5);
    const y = q * 4;
    setMonthlyTarget(String(m));
    setWeeklyTarget(String(w));
    setDailyTarget(String(d));
    setYearlyTarget(String(y));
    if (!target || target === '0') setTarget(String(d));
  };

  const handleAutoDistributeFromMonthly = () => {
    const m = Number(monthlyTarget);
    if (!m || isNaN(m) || m <= 0) return;
    const q = m * 3;
    const w = Math.round(m / 4);
    const d = Math.round(w / 5);
    const y = m * 12;
    setQuarterlyTarget(String(q));
    setWeeklyTarget(String(w));
    setDailyTarget(String(d));
    setYearlyTarget(String(y));
    if (!target || target === '0') setTarget(String(d));
  };

  const handleAutoDistributeFromDaily = () => {
    const d = Number(dailyTarget);
    if (!d || isNaN(d) || d <= 0) return;
    const w = d * 5;
    const m = w * 4;
    const q = m * 3;
    const y = m * 12;
    setWeeklyTarget(String(w));
    setMonthlyTarget(String(m));
    setQuarterlyTarget(String(q));
    setYearlyTarget(String(y));
    setTarget(String(d));
  };

  const currentPresetMeta = FORMULA_PRESETS.find((p) => p.id === selectedPreset) || FORMULA_PRESETS[0];
  const targetNum = Number(target) || Number(dailyTarget) || Number(monthlyTarget) || 10;
  const sim = currentPresetMeta.example(targetNum);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string | undefined> = {
      ...validateForm(
        { name, unit },
        {
          name: [required('KPI Name')],
          unit: [required('Measurement Unit')],
        },
      ),
    };

    // Validate that at least one period target is specified
    const hasAnyTarget =
      dailyTarget.trim() ||
      weeklyTarget.trim() ||
      monthlyTarget.trim() ||
      quarterlyTarget.trim() ||
      yearlyTarget.trim() ||
      target.trim();

    if (!hasAnyTarget) {
      errs.target = 'At least one period target (Daily, Weekly, Monthly, Quarterly, or Yearly) is required.';
    }

    if (weight.trim()) {
      const wErr = nonNegativeNumber({ max: 100 })(weight);
      if (wErr) errs.weight = wErr;
    }

    setErrors(errs);
    if (hasErrors(errs)) return;

    const parsedDaily = dailyTarget.trim() ? Number(dailyTarget) : null;
    const parsedWeekly = weeklyTarget.trim() ? Number(weeklyTarget) : null;
    const parsedMonthly = monthlyTarget.trim() ? Number(monthlyTarget) : null;
    const parsedQuarterly = quarterlyTarget.trim() ? Number(quarterlyTarget) : null;
    const parsedYearly = yearlyTarget.trim() ? Number(yearlyTarget) : null;

    const finalTarget =
      target.trim() && Number(target) > 0
        ? Number(target)
        : parsedDaily ?? parsedMonthly ?? parsedQuarterly ?? parsedWeekly ?? parsedYearly ?? 0;

    const finalFrequency =
      frequency || (parsedDaily !== null ? 'daily' : parsedMonthly !== null ? 'monthly' : parsedQuarterly !== null ? 'quarterly' : 'daily');

    setSubmitting(true);
    try {
      await onSubmit({
        code: code.trim() || null,
        name: name.trim(),
        description: description.trim(),
        unit: unit.trim(),
        valueType,
        target: finalTarget,
        frequency: finalFrequency,
        dailyTarget: parsedDaily,
        weeklyTarget: parsedWeekly,
        monthlyTarget: parsedMonthly,
        quarterlyTarget: parsedQuarterly,
        yearlyTarget: parsedYearly,
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
      description="Define multi-period performance targets across Daily, Weekly, Monthly, Quarterly, and Yearly schedules."
      size="xl"
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
        {/* BOA Official Metric Preset Selector */}
        {!isEdit && (
          <div className="rounded-lg border border-gold-300 bg-gold-50/70 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <TableProperties className="size-4 text-gold-700 shrink-0" />
              <div>
                <div className="text-xs font-bold text-zinc-900">Load BOA Standard Metric Template</div>
                <div className="text-[11px] text-zinc-600">Quickly populate from Bank of Abyssinia branch performance scorecard</div>
              </div>
            </div>
            <div className="w-full sm:w-64">
              <Select
                value=""
                onChange={(e) => {
                  if (e.target.value) handleApplyBoaPreset(e.target.value);
                }}
                className="bg-white text-xs"
              >
                <option value="">Choose BOA template...</option>
                {BOA_METRIC_PRESETS.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.code}. {p.name} ({p.unit})
                  </option>
                ))}
              </Select>
            </div>
          </div>
        )}

        {/* Basic KPI Identification */}
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="S/N (Code)" hint="e.g. 1, 2, 3.1">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. 1"
            />
          </Field>

          <div className="sm:col-span-3">
            <Field label="KPI Name" error={errors.name} required>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. LCY Deposit, IFB Deposit, FCY, SWIFT"
              />
            </Field>
          </div>
        </div>

        <Field label="Description" hint="Operational definition and guidelines for branch staff.">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Operational explanation of what this KPI measures and how it contributes to branch delivery."
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Value Type" required>
            <Select value={valueType} onChange={(e) => setValueType(e.target.value as KpiValueType)}>
              {VALUE_TYPES.map((vt) => (
                <option key={vt.value} value={vt.value}>
                  {vt.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Measurement Unit" error={errors.unit} required>
            <Input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g. ETB, USD, Accounts, Cards, Merchants"
            />
          </Field>
        </div>

        {/* Multi-Period Targets Matrix Section (Core Requirement) */}
        <div className="rounded-lg border border-zinc-200 bg-zinc-50/90 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 pb-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                <TableProperties className="size-3.5 text-gold-600" /> Multi-Period Target Breakdown
              </span>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Define the expected delivery volume per schedule. Leave blank if not applicable (e.g. daily export).
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-zinc-500 font-medium">Auto-distribute:</span>
              <button
                type="button"
                onClick={handleAutoDistributeFromQuarterly}
                disabled={!quarterlyTarget}
                className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 border border-zinc-200 hover:bg-gold-50 hover:border-gold-300 disabled:opacity-40 transition-colors cursor-pointer"
                title="Calculate Monthly (Q/3), Weekly (M/4), Daily (W/5), and Yearly (Q*4)"
              >
                <Wand2 className="size-3 text-gold-600" /> From Quarterly
              </button>
              <button
                type="button"
                onClick={handleAutoDistributeFromMonthly}
                disabled={!monthlyTarget}
                className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 border border-zinc-200 hover:bg-gold-50 hover:border-gold-300 disabled:opacity-40 transition-colors cursor-pointer"
                title="Calculate Quarterly (M*3), Weekly (M/4), Daily (W/5), and Yearly (M*12)"
              >
                <Wand2 className="size-3 text-gold-600" /> From Monthly
              </button>
              <button
                type="button"
                onClick={handleAutoDistributeFromDaily}
                disabled={!dailyTarget}
                className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 border border-zinc-200 hover:bg-gold-50 hover:border-gold-300 disabled:opacity-40 transition-colors cursor-pointer"
                title="Calculate Weekly (D*5), Monthly (W*4), Quarterly (M*3), and Yearly (M*12)"
              >
                <Wand2 className="size-3 text-gold-600" /> From Daily
              </button>
            </div>
          </div>

          {errors.target && (
            <p className="text-xs font-medium text-red-600">{errors.target}</p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Field label="Quarterly Target" hint="Per quarter">
              <Input
                type="number"
                step="any"
                value={quarterlyTarget}
                onChange={(e) => setQuarterlyTarget(e.target.value)}
                placeholder="e.g. 17,875,000"
                suffix={unit}
              />
            </Field>

            <Field label="Monthly Target" hint="Quarterly ÷ 3">
              <Input
                type="number"
                step="any"
                value={monthlyTarget}
                onChange={(e) => setMonthlyTarget(e.target.value)}
                placeholder="e.g. 5,958,333"
                suffix={unit}
              />
            </Field>

            <Field label="Weekly Target" hint="Monthly ÷ 4">
              <Input
                type="number"
                step="any"
                value={weeklyTarget}
                onChange={(e) => setWeeklyTarget(e.target.value)}
                placeholder="e.g. 1,489,583"
                suffix={unit}
              />
            </Field>

            <Field label="Daily Target" hint="Weekly ÷ 5">
              <Input
                type="number"
                step="any"
                value={dailyTarget}
                onChange={(e) => setDailyTarget(e.target.value)}
                placeholder="e.g. 297,917"
                suffix={unit}
              />
            </Field>

            <Field label="Yearly Target" hint="Quarterly × 4">
              <Input
                type="number"
                step="any"
                value={yearlyTarget}
                onChange={(e) => setYearlyTarget(e.target.value)}
                placeholder="e.g. 71,500,000"
                suffix={unit}
              />
            </Field>
          </div>

          <p className="text-[11px] text-zinc-500 italic">
            BOA standard banking proportion: 1 Year = 4 Quarters = 12 Months; 1 Month = 4 Weeks; 1 Week = 5 Banking Days.
          </p>
        </div>

        {/* Primary Period, Baseline Target, and Weight */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Primary Entry Schedule" hint="Main frequency for entries">
            <Select value={frequency} onChange={(e) => setFrequency(e.target.value as KpiFrequency)}>
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Primary Target" hint="Default entry baseline">
            <Input
              type="number"
              step="any"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              suffix={unit}
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

        {/* Attainment Formula Preset Selector */}
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
            Select how staff attainment is calculated. Formula presets adapt automatically to targets.
          </p>

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

          {selectedPreset === 'custom' && (
            <div className="space-y-2 pt-2 border-t border-zinc-200">
              <Field
                label="Custom Rule Expression"
                hint="Click quick tokens below to insert variables into your expression."
              >
                <Input
                  value={calculationRule}
                  onChange={(e) => setCalculationRule(e.target.value)}
                  placeholder="e.g. (Actual / Target) * Weight"
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
