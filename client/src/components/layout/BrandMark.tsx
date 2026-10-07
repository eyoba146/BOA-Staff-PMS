import { cn } from '@/utils/cn';

/**
 * PLACEHOLDER brand mark — intentionally NOT a reproduction of the official Bank of Abyssinia logo.
 * When the official asset is supplied, add it to src/assets/brand/ and render it here only.
 */
export function BrandMark({ tone = 'dark', compact, className }: { tone?: 'dark' | 'light'; compact?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-md',
          tone === 'dark' ? 'bg-ink-800 ring-1 ring-ink-700' : 'bg-ink-950',
        )}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" className="size-5">
          <path d="M12 3.5 19.5 12 12 20.5 4.5 12Z" fill="none" stroke="#F5B82A" strokeWidth="2" strokeLinejoin="round" />
          <path d="M12 8.5 15 12l-3 3.5L9 12Z" fill="#F5B82A" />
        </svg>
      </span>
      {!compact && (
        <span className="min-w-0 leading-tight">
          <span className={cn('block text-[13px] font-semibold tracking-tight', tone === 'dark' ? 'text-white' : 'text-zinc-900')}>
            Bank of Abyssinia
          </span>
          <span className={cn('block text-xs', tone === 'dark' ? 'text-gold-300' : 'text-gold-700')}>Staff Performance</span>
        </span>
      )}
    </div>
  );
}
