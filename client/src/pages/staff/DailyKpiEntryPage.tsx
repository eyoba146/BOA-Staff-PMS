import { useState, useCallback, useEffect, type FormEvent } from 'react';
import { Calendar, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/context/ToastContext';
import { kpiService } from '@/services/kpi.service';
import { kpiEntryService } from '@/services/kpiEntry.service';
import { settingsService } from '@/services/settings.service';
import { todayISO, formatDate, addDays } from '@/utils/date';
import { PageHeader, ConfirmDialog, AsyncBoundary } from '@/components/shared';
import { KpiEntryRow } from '@/components/kpi/KpiEntryRow';
import { Button, Input, Field, Alert, Card, CardBody } from '@/components/ui';
import type { AssignedKpi } from '@/types';

export function DailyKpiEntryPage() {
  const toast = useToast();
  const [selectedDate, setSelectedDate] = useState(todayISO());

  // Input states per KPI: { [kpiId]: value }
  const [actualValues, setActualValues] = useState<Record<string, string>>({});
  const [noteValues, setNoteValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [reviewOpen, setReviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    const [assigned, settings] = await Promise.all([
      kpiService.getMyAssignedKpis(selectedDate),
      settingsService.get(),
    ]);

    return { assigned, settings };
  }, [selectedDate]);

  const state = useAsync(loadData, [loadData]);

  // Synchronize form values when assigned KPIs load
  useEffect(() => {
    if (state.data) {
      const initialActuals: Record<string, string> = {};
      const initialNotes: Record<string, string> = {};
      state.data.assigned.forEach((item) => {
        if (item.entry) {
          initialActuals[item.kpi.id] = String(item.entry.actual);
          initialNotes[item.kpi.id] = item.entry.note ?? '';
        } else {
          initialActuals[item.kpi.id] = '';
          initialNotes[item.kpi.id] = '';
        }
      });
      setActualValues(initialActuals);
      setNoteValues(initialNotes);
      setErrors({});
    }
  }, [state.data]);

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
  };

  const handleActualChange = (kpiId: string, val: string) => {
    setActualValues((prev) => ({ ...prev, [kpiId]: val }));
    if (errors[kpiId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[kpiId];
        return next;
      });
    }
  };

  const handleNoteChange = (kpiId: string, val: string) => {
    setNoteValues((prev) => ({ ...prev, [kpiId]: val }));
  };

  const validateAll = (assigned: AssignedKpi[]) => {
    const errs: Record<string, string> = {};
    for (const item of assigned) {
      const val = actualValues[item.kpi.id]?.trim();
      if (!val) {
        errs[item.kpi.id] = 'Achievement value is required';
      } else {
        const num = Number(val);
        if (Number.isNaN(num)) {
          errs[item.kpi.id] = 'Must be a valid number';
        } else if (num < 0) {
          errs[item.kpi.id] = 'Cannot be negative';
        }
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleOpenReview = (e: FormEvent, assigned: AssignedKpi[]) => {
    e.preventDefault();
    if (validateAll(assigned)) {
      setReviewOpen(true);
    } else {
      toast.error('Validation error', 'Please fill in valid achievement values for all assigned KPIs.');
    }
  };

  const handleFinalSubmit = async (assigned: AssignedKpi[]) => {
    setSubmitting(true);
    try {
      const submissionList = assigned.map((item) => ({
        kpiId: item.kpi.id,
        actual: Number(actualValues[item.kpi.id]),
        note: noteValues[item.kpi.id]?.trim() || undefined,
      }));

      await kpiEntryService.submit({
        date: selectedDate,
        entries: submissionList,
      });

      toast.success('KPI entries saved', `Performance records for ${formatDate(selectedDate)} successfully submitted.`);
      setReviewOpen(false);
      await state.reload();
    } catch (err) {
      toast.error('Failed to save entries', (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily KPI Entry"
        description="Record your daily and periodic actual achievements against approved branch targets."
        documentTitle="Daily KPI Entry"
      />

      <AsyncBoundary state={state}>
        {({ assigned, settings }) => {
          const minDate = addDays(todayISO(), -settings.entryPolicy.backdateDays);
          const maxDate = todayISO();
          const submittedCount = assigned.filter((a) => a.entry !== null).length;
          const isSubmitted = assigned.length > 0 && submittedCount === assigned.length;

          return (
            <div className="space-y-6">
              {/* Date selection and policy bar */}
              <Card>
                <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <Field label="Performance Date" className="w-52">
                      <Input
                        type="date"
                        min={minDate}
                        max={maxDate}
                        value={selectedDate}
                        onChange={(e) => handleDateChange(e.target.value)}
                        leftIcon={<Calendar />}
                      />
                    </Field>
                    <div className="text-xs text-zinc-500 pt-5">
                      Backdating allowed up to {settings.entryPolicy.backdateDays} day(s).
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isSubmitted ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="size-4" />
                        Submitted ({submittedCount}/{assigned.length})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 border border-orange-200">
                        <AlertCircle className="size-4" />
                        {submittedCount > 0 ? `Partially submitted (${submittedCount}/${assigned.length})` : 'Pending submission'}
                      </span>
                    )}
                  </div>
                </CardBody>
              </Card>

              {/* Form body */}
              {assigned.length === 0 ? (
                <Alert tone="info">
                  You currently do not have any active KPIs assigned for this date. Please contact the branch manager if assignments are needed.
                </Alert>
              ) : (
                <form onSubmit={(e) => handleOpenReview(e, assigned)} className="space-y-4">
                  <div className="space-y-3">
                    {assigned.map((item) => (
                      <KpiEntryRow
                        key={item.kpi.id}
                        item={item}
                        actual={actualValues[item.kpi.id] ?? ''}
                        note={noteValues[item.kpi.id] ?? ''}
                        error={errors[item.kpi.id]}
                        onActualChange={(val) => handleActualChange(item.kpi.id, val)}
                        onNoteChange={(val) => handleNoteChange(item.kpi.id, val)}
                      />
                    ))}
                  </div>

                  {/* Sticky submit bar */}
                  <div className="sticky bottom-4 z-20 flex items-center justify-between rounded-lg border border-zinc-200 bg-white/95 p-4 shadow-lg backdrop-blur-sm">
                    <div className="text-xs text-zinc-600">
                      Target date: <span className="font-semibold text-zinc-900">{formatDate(selectedDate)}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button
                        type="submit"
                        variant="accent"
                        size="md"
                        leftIcon={<Save className="size-4" />}
                      >
                        {isSubmitted ? 'Review & Update' : 'Review & Submit'}
                      </Button>
                    </div>
                  </div>
                </form>
              )}

              {/* Review & Submit Confirmation Dialog */}
              <ConfirmDialog
                open={reviewOpen}
                title="Confirm KPI Submission"
                description={`Review your recorded achievements for ${formatDate(selectedDate)} before saving.`}
                confirmLabel="Confirm & Submit"
                loading={submitting}
                onConfirm={() => handleFinalSubmit(assigned)}
                onCancel={() => setReviewOpen(false)}
              >
                <div className="mt-3 space-y-2 rounded-md border border-zinc-100 bg-zinc-50 p-3 text-xs">
                  {assigned.map((item) => {
                    const actual = actualValues[item.kpi.id];
                    return (
                      <div key={item.kpi.id} className="flex justify-between items-center py-1 border-b border-zinc-100 last:border-0">
                        <span className="font-medium text-zinc-800">{item.kpi.name}:</span>
                        <span className="font-semibold text-zinc-900 tabular">
                          {actual} {item.kpi.unit} (Target: {item.target} {item.kpi.unit})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </ConfirmDialog>
            </div>
          );
        }}
      </AsyncBoundary>
    </div>
  );
}
