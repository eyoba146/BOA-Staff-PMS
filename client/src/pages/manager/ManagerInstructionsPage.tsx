import { useCallback, useEffect, useState } from 'react';
import {
  ClipboardList,
  Clock3,
  LoaderCircle,
  Send,
  Users,
  UserRound,
  Sparkles,
} from 'lucide-react';
import type { DailyInstruction, DailyInstructionInput } from '@/types';
import { instructionService } from '@/services/instruction.service';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { useCurrentUser } from '@/context/AuthContext';

interface ActiveStaff {
  id: string;
  fullName: string;
  referenceId: string;
}

export function ManagerInstructionsPage() {
  const currentUser = useCurrentUser();
  const isCem = currentUser?.role === 'customer_experience_manager';

  const [instructions, setInstructions] = useState<DailyInstruction[]>([]);
  const [staff, setStaff] = useState<ActiveStaff[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<DailyInstructionInput['audience']>('all');
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

      toast.showToast({
        tone: 'gold',
        title: 'Instruction Published',
        message: 'Your daily instruction has been shared successfully with staff.',
      });

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
        title={isCem ? 'Customer Experience Daily Directives' : 'Daily Staff Instructions'}
        description={
          isCem
            ? 'Broadcast daily customer experience priorities, service guidelines, and operational directions.'
            : 'Provide branch staff with clear daily priorities, service reminders, and operational directions.'
        }
        documentTitle="Daily Instructions"
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* Instruction Creation Form */}
        <section className="h-fit rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs sm:p-6">
          <div className="mb-6 flex items-center gap-3 border-b border-zinc-100 pb-4">
            <div className="flex size-11 items-center justify-center rounded-xl bg-gold-500/15 text-gold-700">
              <Send className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 sm:text-lg">Publish Daily Instruction</h2>
              <p className="text-xs text-zinc-500">
                Share operational priorities and action points with your team.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="instruction-title" className="text-xs font-semibold text-zinc-900">
                Instruction Title
              </label>
              <input
                id="instruction-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Morning Briefing: Counter Queue Flow & Priority Mobilization"
                maxLength={120}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="instruction-body" className="text-xs font-semibold text-zinc-900">
                Instructions and Directives
              </label>
              <textarea
                id="instruction-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Write the specific action items, service reminders, or operational priorities for staff today..."
                rows={5}
                className="w-full resize-y rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
                required
              />
            </div>

            <fieldset className="space-y-2.5">
              <legend className="text-xs font-semibold text-zinc-900 mb-1">
                Recipient Audience
              </legend>

              <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${audience === 'all' ? 'border-gold-500 bg-gold-50/50' : 'border-zinc-200 hover:bg-zinc-50'}`}>
                <input
                  type="radio"
                  name="instruction-audience"
                  value="all"
                  checked={audience === 'all'}
                  onChange={() => setAudience('all')}
                  className="mt-0.5 accent-gold-600"
                />
                <div>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-900">
                    <Users className="size-3.5 text-gold-700" />
                    All Active Staff
                  </span>
                  <p className="mt-0.5 text-xs text-zinc-500 leading-normal">
                    {isCem ? 'Broadcast to all active staff in branch supervision.' : 'Everyone in the branch can see this instruction.'}
                  </p>
                </div>
              </label>

              <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${audience === 'selected' ? 'border-gold-500 bg-gold-50/50' : 'border-zinc-200 hover:bg-zinc-50'}`}>
                <input
                  type="radio"
                  name="instruction-audience"
                  value="selected"
                  checked={audience === 'selected'}
                  onChange={() => setAudience('selected')}
                  className="mt-0.5 accent-gold-600"
                />
                <div>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-900">
                    <UserRound className="size-3.5 text-gold-700" />
                    Selected Staff Members
                  </span>
                  <p className="mt-0.5 text-xs text-zinc-500 leading-normal">
                    Target specific staff members who need this guidance.
                  </p>
                </div>
              </label>
            </fieldset>

            {audience === 'selected' && (
              <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
                <div className="flex items-center justify-between gap-3 border-b border-zinc-200 pb-2">
                  <h3 className="text-xs font-bold text-zinc-900">Select Staff Recipients</h3>
                  <span className="text-xs font-medium text-gold-700">
                    {selectedStaffIds.length} of {staff.length} selected
                  </span>
                </div>

                {staff.length === 0 ? (
                  <p className="text-xs text-zinc-500">
                    No active staff members are available.
                  </p>
                ) : (
                  <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                    {staff.map((member) => (
                      <label
                        key={member.id}
                        className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-transparent p-2 transition-colors hover:border-zinc-200 hover:bg-white"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStaffIds.includes(member.id)}
                          onChange={() => toggleStaff(member.id)}
                          className="size-4 accent-gold-600 rounded"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-semibold text-zinc-900">
                            {member.fullName}
                          </span>
                          <span className="block text-[11px] text-zinc-500">
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
                className="rounded-xl border border-red-200 bg-red-50/60 p-3 text-xs font-medium text-red-700"
              >
                {error}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              loading={saving}
              leftIcon={<Send className="size-4" />}
              className="w-full"
            >
              Publish Instruction
            </Button>
          </form>
        </section>

        {/* Published Instructions Feed */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs sm:p-6">
          <div className="mb-6 flex items-center justify-between gap-3 border-b border-zinc-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-gold-500/15 text-gold-700">
                <ClipboardList className="size-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-900 sm:text-lg">Published Instructions</h2>
                <p className="text-xs text-zinc-500">
                  Review all active and historical directives dispatched to branch personnel.
                </p>
              </div>
            </div>
            {instructions.length > 0 && (
              <span className="rounded-full bg-gold-50 px-2.5 py-0.5 text-xs font-bold text-gold-800 border border-gold-200">
                {instructions.length} total
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-500">
              <LoaderCircle className="size-5 animate-spin text-gold-600" />
              <span>Loading instructions...</span>
            </div>
          ) : instructions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 px-5 py-14 text-center">
              <ClipboardList className="mx-auto mb-3 size-10 text-zinc-400" />
              <h3 className="text-base font-bold text-zinc-900">No instructions published yet</h3>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-zinc-500">
                Instructions published using the form will appear here for reference and audit history.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {instructions.map((instruction) => (
                <article
                  key={instruction.id}
                  className="rounded-xl border border-zinc-200 bg-zinc-50/40 p-4 transition-colors hover:border-gold-300 hover:bg-gold-50/20 sm:p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-200 bg-gold-50 px-2.5 py-0.5 font-semibold text-gold-800">
                      {instruction.audience === 'all' ? (
                        <>
                          <Users className="size-3 text-gold-600" />
                          All active staff
                        </>
                      ) : (
                        <>
                          <UserRound className="size-3 text-gold-600" />
                          {instruction.targetStaffIds.length} selected staff
                        </>
                      )}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                      <Clock3 className="size-3.5 text-zinc-400" />
                      {new Date(instruction.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <h3 className="mt-3 text-base font-bold text-zinc-900">{instruction.title}</h3>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-700">
                    {instruction.body}
                  </p>

                  <div className="mt-4 flex items-center justify-between border-t border-zinc-200/80 pt-3 text-xs text-zinc-500">
                    <span className="font-medium text-zinc-700 flex items-center gap-1.5">
                      <Sparkles className="size-3 text-gold-600" />
                      {instruction.authorName}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
