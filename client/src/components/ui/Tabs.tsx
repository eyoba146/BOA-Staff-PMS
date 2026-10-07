import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
  badge?: ReactNode;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

/** Arrow-key navigation shared by Tabs and SegmentedControl (roving focus). */
function useArrowNav<T extends string>(items: TabItem<T>[], value: T, onChange: (v: T) => void) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const onKeyDown = (e: KeyboardEvent) => {
    const idx = items.findIndex((i) => i.value === value);
    let next = -1;
    if (e.key === 'ArrowRight') next = (idx + 1) % items.length;
    if (e.key === 'ArrowLeft') next = (idx - 1 + items.length) % items.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = items.length - 1;
    if (next >= 0) {
      e.preventDefault();
      onChange(items[next].value);
      refs.current[next]?.focus();
    }
  };
  return { refs, onKeyDown };
}

/** Underline tabs for switching page sections. */
export function Tabs<T extends string>({ items, value, onChange, label, className }: TabsProps<T>) {
  const { refs, onKeyDown } = useArrowNav(items, value, onChange);
  return (
    <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className={cn('flex gap-1 overflow-x-auto border-b border-zinc-200 scrollbar-thin', className)}>
      {items.map((item, i) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            type="button"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.value)}
            className={cn(
              '-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
              selected ? 'border-ink-900 text-zinc-900' : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-800',
            )}
          >
            {item.label}
            {item.badge}
          </button>
        );
      })}
    </div>
  );
}

/** Compact segmented control (e.g. Daily / Weekly / Monthly / Quarterly). */
export function SegmentedControl<T extends string>({ items, value, onChange, label, className }: TabsProps<T>) {
  const { refs, onKeyDown } = useArrowNav(items, value, onChange);
  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn('inline-flex rounded-md border border-zinc-200 bg-zinc-100/70 p-0.5', className)}
    >
      {items.map((item, i) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="radio"
            type="button"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.value)}
            className={cn(
              'h-7 flex-1 rounded px-3 text-[13px] font-medium whitespace-nowrap transition-colors',
              selected ? 'bg-white text-zinc-900 shadow-xs ring-1 ring-zinc-200' : 'text-zinc-600 hover:text-zinc-900',
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
