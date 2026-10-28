import { useCallback, useEffect, useState } from 'react';
import {
  ClipboardList,
  Clock3,
  LoaderCircle,
  Users,
  Inbox,
  UserCheck,
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
        description="Stay informed about your branch's daily priorities, service guidelines, and assigned tasks."
        documentTitle="Daily Instructions"
      />

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="mb-6 flex items-center gap-3 border-b border-zinc-100 pb-4">
          <div className="flex size-11 items-center justify-center rounded-xl bg-gold-500/15 text-gold-700">
            <ClipboardList className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900 sm:text-lg">Instructions for You</h2>
            <p className="text-xs text-zinc-500">
              The newest directives from branch management appear first.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-14 text-sm text-zinc-500">
            <LoaderCircle className="size-5 animate-spin text-gold-600" />
            <span>Loading your instructions...</span>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50/60 p-5">
            <p className="text-sm font-medium text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => void loadInstructions()}
              className="mt-3 text-xs font-semibold text-gold-700 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : instructions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 px-5 py-14 text-center">
            <Inbox className="mx-auto mb-3 size-10 text-zinc-400" />
            <h3 className="text-base font-bold text-zinc-900">You are all caught up</h3>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-zinc-500">
              There are no active daily instructions right now. New guidelines from branch management will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 text-xs font-medium text-zinc-500">
              {instructions.length} {instructions.length === 1 ? 'instruction' : 'instructions'} active
            </div>

            <div className="space-y-4">
              {instructions.map((instruction) => (
                <article
                  key={instruction.id}
                  className="rounded-xl border border-zinc-200 bg-zinc-50/40 p-4 transition-colors hover:border-gold-300 hover:bg-gold-50/20 sm:p-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-200 bg-gold-50 px-2.5 py-0.5 text-xs font-semibold text-gold-800">
                      {instruction.audience === 'all' ? (
                        <>
                          <Users className="size-3 text-gold-600" />
                          Branch-wide directive
                        </>
                      ) : (
                        <>
                          <UserCheck className="size-3 text-gold-600" />
                          Assigned to you
                        </>
                      )}
                    </span>
                  </div>

                  <h3 className="mt-3 text-base font-bold text-zinc-900">
                    {instruction.title}
                  </h3>

                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-700">
                    {instruction.body}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200/80 pt-3 text-xs text-zinc-500">
                    <span className="font-medium text-zinc-700">
                      From {instruction.authorName}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 className="size-3.5 text-zinc-400" />
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
