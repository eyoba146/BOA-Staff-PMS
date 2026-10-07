import { useState } from 'react';
import type { AssignedKpi } from '@/types';
import { Badge, Input, Textarea } from '@/components/ui';
import { formatNumber, formatKpiValue } from '@/utils/format';
import { FREQUENCY_LABELS } from '@/utils/status';
import { MessageSquareText } from 'lucide-react';
import { cn } from '@/utils/cn';

interface KpiEntryRowProps {
  item: AssignedKpi;
  actual: string;
  note: string;
  error?: string;
  onActualChange: (val: string) => void;
  onNoteChange: (val: string) => void;
}

export function KpiEntryRow({
  item,
  actual,
  note,
  error,
  onActualChange,
  onNoteChange,
}: KpiEntryRowProps) {
  const [showNote, setShowNote] = useState(Boolean(note || item.entry?.note));
  const { kpi, target } = item;

  // Non-authoritative client preview calculation only (demonstration)
  const numActual = Number(actual);
  const previewPercent =
    actual.trim() !== '' && !Number.isNaN(numActual) && target > 0
      ? (numActual / target) * 100
      : null;

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-colors',
        error ? 'border-red-300 bg-red-50/20' : 'border-zinc-200 bg-white shadow-xs',
      )}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Left: KPI meta */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-900">{kpi.name}</h3>
            <Badge tone="neutral">{FREQUENCY_LABELS[kpi.frequency]}</Badge>
            {kpi.ruleStatus === 'pending_validation' && (
              <span className="text-[11px] text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-200">
                Sample KPI
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{kpi.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-600">
            <span>
              Target:{' '}
              <strong className="text-zinc-900 font-semibold tabular">
                {formatKpiValue(target, kpi.unit, kpi.valueType)}
              </strong>
            </span>
            {kpi.weight !== null && (
              <span className="text-zinc-500">Weight: {kpi.weight}%</span>
            )}
            {item.entry && (
              <span className="text-emerald-700 font-medium">
                Previously submitted: {formatNumber(item.entry.actual)} {kpi.unit}
              </span>
            )}
          </div>
        </div>

        {/* Right: Actual Input + Preview */}
        <div className="flex flex-wrap items-center gap-3 md:w-80 md:justify-end">
          <div className="w-36">
            <Input
              type="number"
              step={kpi.valueType === 'decimal' ? '0.01' : '1'}
              min="0"
              placeholder="0"
              value={actual}
              onChange={(e) => onActualChange(e.target.value)}
              invalid={Boolean(error)}
              suffix={kpi.unit}
              className="text-right tabular font-medium"
            />
            {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
          </div>

          {/* Demonstration Preview % */}
          <div className="w-24 text-right">
            <span className="block text-[11px] text-zinc-400">Preview %</span>
            <span
              className={cn(
                'text-sm font-semibold tabular',
                previewPercent === null
                  ? 'text-zinc-300'
                  : previewPercent >= 100
                  ? 'text-emerald-600'
                  : previewPercent >= 80
                  ? 'text-orange-600'
                  : 'text-red-600',
              )}
            >
              {previewPercent !== null ? `${previewPercent.toFixed(1)}%` : '—'}
            </span>
          </div>

          {/* Note Toggle */}
          <button
            type="button"
            onClick={() => setShowNote(!showNote)}
            className={cn(
              'flex size-9 items-center justify-center rounded-md border transition-colors',
              showNote || note
                ? 'border-zinc-300 bg-zinc-100 text-zinc-900'
                : 'border-zinc-200 bg-white text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50',
            )}
            title="Add a note or remark for this entry"
            aria-label="Add note"
          >
            <MessageSquareText className="size-4" />
          </button>
        </div>
      </div>

      {/* Expandable note */}
      {showNote && (
        <div className="mt-3 pt-3 border-t border-zinc-100">
          <Textarea
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            rows={2}
            placeholder="Add operational remarks or context regarding this KPI achievement..."
            className="text-xs"
          />
        </div>
      )}
    </div>
  );
}
