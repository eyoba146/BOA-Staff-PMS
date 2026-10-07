import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

/** Scroll container + table. Use `hideBelow` on low-priority columns for small screens. */
export function Table({ className, children, caption }: { className?: string; children: ReactNode; caption?: string }) {
  return (
    <div className={cn('overflow-x-auto scrollbar-thin', className)}>
      <table className="w-full min-w-full border-collapse text-left text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="border-y border-zinc-200 bg-zinc-50/80">{children}</thead>;
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-zinc-100">{children}</tbody>;
}

export function TR({ className, interactive, ...rest }: HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean }) {
  return <tr className={cn(interactive && 'cursor-pointer transition-colors hover:bg-zinc-50', className)} {...rest} />;
}

type Align = 'left' | 'right' | 'center';
type Hide = 'sm' | 'md' | 'lg' | 'xl';

const HIDE: Record<Hide, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
};
const ALIGN: Record<Align, string> = { left: 'text-left', right: 'text-right', center: 'text-center' };

interface CellExtras {
  align?: Align;
  hideBelow?: Hide;
}

export function TH({ align = 'left', hideBelow, className, ...rest }: ThHTMLAttributes<HTMLTableCellElement> & CellExtras) {
  return (
    <th
      scope="col"
      className={cn(
        'px-4 py-2.5 text-xs font-medium whitespace-nowrap text-zinc-500 first:pl-4 sm:first:pl-5 last:pr-4 sm:last:pr-5',
        ALIGN[align],
        hideBelow && HIDE[hideBelow],
        className,
      )}
      {...rest}
    />
  );
}

export function TD({ align = 'left', hideBelow, className, ...rest }: TdHTMLAttributes<HTMLTableCellElement> & CellExtras) {
  return (
    <td
      className={cn(
        'px-4 py-3 align-middle text-zinc-700 first:pl-4 sm:first:pl-5 last:pr-4 sm:last:pr-5',
        ALIGN[align],
        align === 'right' && 'tabular',
        hideBelow && HIDE[hideBelow],
        className,
      )}
      {...rest}
    />
  );
}
