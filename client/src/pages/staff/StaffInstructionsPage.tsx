
import { useCallback, useEffect, useState } from 'react';
import {
  ClipboardList,
  Clock3,
  LoaderCircle,
  Users,
  Inbox,
} from 'lucide-react';
import type { DailyInstruction } from '@/types';
import { instructionService } from '@/services/instruction.service';
import { PageHeader } from '@/components/shared/PageHeader';

export function StaffInstructionsPage() {
  const [instructions, setInstructions] = useState<DailyInstruction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadInstructions = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await instructionService.list();
      setInstructions(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load your daily instructions.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInstructions();
  }, [loadInstructions]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Instructions"
        description="Stay informed about your branch's priorities and the tasks assigned to you."
      />

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-3 text-primary">
            <ClipboardList size={22} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Instructions for you</h2>
            <p className="text-sm text-muted-foreground">
              The newest instructions appear first.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground">
            <LoaderCircle size={19} className="animate-spin" />
            Loading your instructions...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/30 p-5">
            <p className="text-sm text-destructive">{error}</p>
            <button
              type="button"
              onClick={() => void loadInstructions()}
              className="mt-3 text-sm font-medium text-primary"
            >
              Try again
            </button>
          </div>
        ) : instructions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-5 py-14 text-center">
            <Inbox
              size={34}
              className="mx-auto mb-3 text-muted-foreground"
            />
            <h3 className="font-semibold">You're all caught up</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              There are no daily instructions for you right now. New
              instructions from your branch manager will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-muted-foreground">
              {instructions.length}{' '}
              {instructions.length === 1 ? 'instruction' : 'instructions'}
            </div>

            <div className="space-y-4">
              {instructions.map((instruction) => (
                <article
                  key={instruction.id}
                  className="rounded-xl border border-border p-4 transition-colors hover:bg-muted/20 sm:p-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      <Users size={13} />
                      {instruction.audience === 'all'
                        ? 'Branch-wide instruction'
                        : 'Assigned to you'}
                    </span>
                  </div>

                  <h3 className="mt-4 text-base font-semibold sm:text-lg">
                    {instruction.title}
                  </h3>

                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">
                    {instruction.body}
                  </p>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
                    <span>
                      From {instruction.authorName}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 size={14} />
                      {new Date(instruction.createdAt).toLocaleString()}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
