import { Check } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface AuthStep {
  id: string;
  label: string;
}

interface AuthStepIndicatorProps {
  steps: AuthStep[];
  currentStepIndex: number;
  className?: string;
}

/**
 * Institutional multi-step progress indicator for authentication journeys.
 */
export function AuthStepIndicator({ steps, currentStepIndex, className }: AuthStepIndicatorProps) {
  return (
    <nav aria-label="Progress" className={cn('w-full', className)}>
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isUpcoming = index > currentStepIndex;

          return (
            <li key={step.id} className="relative flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center group">
                <div
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full text-xs transition-all',
                    isCompleted && 'bg-ink-950 text-gold-400 border border-gold-500/50 shadow-xs',
                    isCurrent && 'bg-ink-950 text-gold-400 ring-2 ring-gold-500/50 font-bold shadow-xs',
                    isUpcoming && 'border border-zinc-200 bg-zinc-100 text-zinc-400 font-medium',
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isCompleted ? (
                    <Check className="size-4 text-gold-400 stroke-[2.5]" aria-hidden />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    'mt-2 text-center text-[11.5px] whitespace-nowrap transition-colors',
                    isCurrent ? 'font-semibold text-zinc-950' : isCompleted ? 'font-medium text-zinc-600' : 'text-zinc-400',
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connecting line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'mx-2 sm:mx-4 h-0.5 flex-1 -mt-6 transition-colors',
                    index < currentStepIndex ? 'bg-gold-500' : 'bg-zinc-200',
                  )}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
