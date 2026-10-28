
import { useCallback, useEffect, useState } from 'react';
import {
  ClipboardList,
  Clock3,
  LoaderCircle,
  Send,
  Users,
  UserRound,
} from 'lucide-react';
import type { DailyInstruction, DailyInstructionInput } from '@/types';
import { instructionService } from '@/services/instruction.service';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';

interface ActiveStaff {
  id: string;
  fullName: string;
  referenceId: string;
}

export function ManagerInstructionsPage() {
  const [instructions, setInstructions] = useState<DailyInstruction[]>([]);
  const [staff, setStaff] = useState<ActiveStaff[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] =
    useState<DailyInstructionInput['audience']>('all');
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toast = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [instructionData, staffData] = await Promise.all([
        instructionService.list(),
        instructionService.getActiveStaff(),
      ]);

      setInstructions(instructionData);
      setStaff(staffData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load daily instructions.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function toggleStaff(id: string) {
    setSelectedStaffIds((current) =>
      current.includes(id)
        ? current.filter((staffId) => staffId !== id)
        : [...current, id],
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!title.trim() || !body.trim()) {
      setError('Enter an instruction title and description.');
      return;
    }

    if (audience === 'selected' && selectedStaffIds.length === 0) {
      setError('Select at least one staff member.');
      return;
    }

    setSaving(true);

    try {
      await instructionService.create({
        title,
        body,
        audience,
        targetStaffIds: audience === 'all' ? [] : selectedStaffIds,
      });

toast.success(
  'Instruction published',
  'Your daily instruction has been shared successfully.',
);
      setTitle('');
      setBody('');
      setAudience('all');
      setSelectedStaffIds([]);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to publish the instruction.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Instructions"
        description="Give your branch staff clear daily priorities and directions."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className="h-fit rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <Send size={22} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Create instruction</h2>
              <p className="text-sm text-muted-foreground">
                Share priorities with your team.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="instruction-title" className="text-sm font-medium">
                Instruction title
              </label>
              <input
                id="instruction-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Today's customer service priorities"
                maxLength={120}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="instruction-body" className="text-sm font-medium">
                Instructions and details
              </label>
              <textarea
                id="instruction-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Write the priorities, directions, or important reminders for your staff..."
                rows={6}
                className="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm leading-6 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">
                Who should receive this?
              </legend>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 transition hover:bg-muted/30">
                <input
                  type="radio"
                  name="instruction-audience"
                  value="all"
                  checked={audience === 'all'}
                  onChange={() => setAudience('all')}
                  className="mt-1 accent-primary"
                />
                <div>
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Users size={16} />
                    All active staff
                  </span>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Everyone in the branch can see this instruction.
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 transition hover:bg-muted/30">
                <input
                  type="radio"
                  name="instruction-audience"
                  value="selected"
                  checked={audience === 'selected'}
                  onChange={() => setAudience('selected')}
                  className="mt-1 accent-primary"
                />
                <div>
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <UserRound size={16} />
                    Selected staff members
                  </span>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Only the staff members you select can see it.
                  </p>
                </div>
              </label>
            </fieldset>

            {audience === 'selected' && (
              <div className="space-y-3 rounded-xl border border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium">Choose staff</h3>
                  <span className="text-xs text-muted-foreground">
                    {selectedStaffIds.length} selected
                  </span>
                </div>

                {staff.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No active staff members are available.
                  </p>
                ) : (
                  <div className="max-h-60 space-y-2 overflow-y-auto">
                    {staff.map((member) => (
                      <label
                        key={member.id}
                        className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/30"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStaffIds.includes(member.id)}
                          onChange={() => toggleStaff(member.id)}
                          className="size-4 accent-primary"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">
                            {member.fullName}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {member.referenceId}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              >
                {error}
              </p>
            )}

            <Button type="submit" disabled={saving} className="w-full">
              {saving ? (
                <>
                  <LoaderCircle size={16} className="mr-2 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Send size={16} className="mr-2" />
                  Publish instruction
                </>
              )}
            </Button>
          </form>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <ClipboardList size={22} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Published instructions</h2>
              <p className="text-sm text-muted-foreground">
                Review the instructions you've shared.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <LoaderCircle size={19} className="animate-spin" />
              Loading instructions...
            </div>
          ) : instructions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-5 py-12 text-center">
              <ClipboardList
                size={32}
                className="mx-auto mb-3 text-muted-foreground"
              />
              <h3 className="font-semibold">No instructions published yet</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Your published instructions will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {instructions.map((instruction) => (
                <article
                  key={instruction.id}
                  className="rounded-xl border border-border p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">
                      {instruction.audience === 'all' ? (
                        <Users size={13} />
                      ) : (
                        <UserRound size={13} />
                      )}
                      {instruction.audience === 'all'
                        ? 'All active staff'
                        : `${instruction.targetStaffIds.length} selected staff`}
                    </span>
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Clock3 size={13} />
                      {new Date(instruction.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <h3 className="mt-4 font-semibold">{instruction.title}</h3>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">
                    {instruction.body}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}


