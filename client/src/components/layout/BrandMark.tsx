import { cn } from '@/utils/cn';

/**
 * PLACEHOLDER brand mark — intentionally NOT a reproduction of the official Bank of Abyssinia logo.
 * When the official asset is supplied, add it to src/assets/brand/ and render it here only.
 */
export function BrandMark({ tone = 'dark', compact, className }: { tone?: 'dark' | 'light'; compact?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <img
        src="/abyssinia-logo.png"
        alt="Bank of Abyssinia"
        className="h-10 w-auto shrink-0 object-contain"
      />
      {!compact && (
        <span className="min-w-0 leading-tight">
          <span className={cn('block text-[13.5px] font-semibold tracking-tight', tone === 'dark' ? 'text-white' : 'text-zinc-900')}>
            Bank of Abyssinia
          </span>
          <span className={cn('block text-xs', tone === 'dark' ? 'text-gold-300' : 'text-gold-700')}>Staff Performance</span>
        </span>
      )}
    </div>
  );
}
