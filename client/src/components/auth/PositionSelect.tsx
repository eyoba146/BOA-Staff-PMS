import { Briefcase, Check, ChevronDown, Search, X } from 'lucide-react';
import { useEffect, useRef, useState, useId } from 'react';
import { positionService } from '@/services/position.service';
import type { Position } from '@/types';
import { cn } from '@/utils/cn';

interface PositionSelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  placeholder?: string;
}

/**
 * Professional searchable and selectable dropdown for approved branch positions.
 * Ensures employees select from manager-approved active positions only.
 */
export function PositionSelect({
  value,
  onChange,
  error,
  disabled,
  id,
  className,
  placeholder = 'Select approved position...',
}: PositionSelectProps) {
  const generatedId = useId();
  const controlId = id || generatedId;
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;
    async function loadPositions() {
      try {
        setLoading(true);
        const data = await positionService.list({ activeOnly: true });
        if (mounted) setPositions(data);
      } catch {
        if (mounted) setPositions([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void loadPositions();
    return () => {
      mounted = false;
    };
  }, []);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const handleDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  // Focus search input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearch('');
    }
  }, [open]);

  const filtered = positions.filter((p) =>
    p.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const selectedPosition = positions.find((p) => p.name.toLowerCase() === value.toLowerCase());

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Trigger Button */}
      <button
        id={controlId}
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select approved position"
        className={cn(
          'flex h-11 w-full items-center justify-between rounded-xl border bg-white px-3.5 text-left text-sm transition-all',
          error
            ? 'border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-500/20'
            : 'border-zinc-300 hover:border-zinc-400 focus:border-ink-900 focus:ring-2 focus:ring-gold-500/30',
          disabled && 'cursor-not-allowed bg-zinc-50 text-zinc-400',
        )}
      >
        <span className="flex items-center gap-2.5 truncate">
          <Briefcase className="size-4 text-zinc-400 shrink-0" aria-hidden />
          {loading ? (
            <span className="text-zinc-400 italic">Loading active positions...</span>
          ) : selectedPosition ? (
            <span className="font-medium text-zinc-900">{selectedPosition.name}</span>
          ) : (
            <span className="text-zinc-400">{placeholder}</span>
          )}
        </span>

        <ChevronDown
          className={cn(
            'size-4 text-zinc-400 transition-transform duration-200 shrink-0',
            open && 'rotate-180 text-zinc-700',
          )}
          aria-hidden
        />
      </button>

      {/* Popover Dropdown */}
      {open && (
        <div
          role="listbox"
          aria-label="Approved positions"
          className="absolute z-50 mt-1.5 w-full min-w-[280px] rounded-xl border border-zinc-200 bg-white p-2 shadow-xl animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Search Field */}
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search approved positions..."
              className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50/70 pl-8 pr-7 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-ink-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-gold-500/40"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                aria-label="Clear position search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Position Options List */}
          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {filtered.length === 0 ? (
              <div className="py-4 text-center text-xs text-zinc-500">
                {positions.length === 0
                  ? 'No approved active positions configured.'
                  : 'No positions matching your search.'}
              </div>
            ) : (
              filtered.map((pos) => {
                const isSelected =
                  pos.name.toLowerCase() === (value || '').trim().toLowerCase();
                return (
                  <button
                    key={pos.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(pos.name);
                      setOpen(false);
                    }}
                    className={cn(
                      'group flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors',
                      isSelected
                        ? 'bg-gold-500/15 font-semibold text-zinc-950'
                        : 'text-zinc-800 hover:bg-zinc-100 hover:text-zinc-950',
                    )}
                  >
                    <span className="truncate">{pos.name}</span>
                    {isSelected && (
                      <Check className="size-3.5 text-gold-700 stroke-[2.5] shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer note */}
          <div className="mt-2 border-t border-zinc-100 pt-1.5 px-2 flex items-center justify-between text-[11px] text-zinc-400">
            <span>{positions.length} active branch positions</span>
            <span>Manager-managed</span>
          </div>
        </div>
      )}
    </div>
  );
}
