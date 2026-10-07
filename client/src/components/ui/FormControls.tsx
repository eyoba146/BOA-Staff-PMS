import { ChevronDown } from 'lucide-react';
import {
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/utils/cn';

const controlBase =
  'block w-full rounded-md border bg-white text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors ' +
  'focus:border-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900/10 ' +
  'disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500';

const borderFor = (invalid?: boolean) => (invalid ? 'border-red-500 focus:border-red-600 focus:ring-red-600/10' : 'border-zinc-300');

// ---------------- Field ----------------
interface FieldProps {
  label: string;
  /** Rendered as the field's control; receives id / aria props automatically. */
  children: ReactElement<{ id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean; invalid?: boolean }>;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  labelAction?: ReactNode;
  /** Visually hide the label (still accessible). */
  hideLabel?: boolean;
}

export function Field({ label, children, hint, error, required, className, labelAction, hideLabel }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  const control = isValidElement(children)
    ? cloneElement(children, { id, 'aria-describedby': describedBy, 'aria-invalid': !!error || undefined, invalid: !!error })
    : children;

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className={cn('flex items-center justify-between gap-2', hideLabel && 'sr-only')}>
        <label htmlFor={id} className="text-sm font-medium text-zinc-800">
          {label}
          {required && (
            <span className="ml-0.5 text-red-600" aria-hidden>
              *
            </span>
          )}
        </label>
        {labelAction}
      </div>
      {control}
      {error ? (
        <p id={errorId} role="alert" className="text-[13px] text-red-700">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="text-[13px] text-zinc-500">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

// ---------------- Input ----------------
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  leftIcon?: ReactNode;
  /** Text or element shown inside the right edge (e.g. a unit). */
  suffix?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, leftIcon, suffix, className, ...rest },
  ref,
) {
  if (!leftIcon && !suffix) {
    return <input ref={ref} className={cn(controlBase, borderFor(invalid), 'h-9 px-3', className)} {...rest} />;
  }
  return (
    <div className="relative">
      {leftIcon && (
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-400 [&>svg]:size-4">{leftIcon}</span>
      )}
      <input
        ref={ref}
        className={cn(controlBase, borderFor(invalid), 'h-9', leftIcon ? 'pl-9' : 'pl-3', suffix ? 'pr-16' : 'pr-3', className)}
        {...rest}
      />
      {suffix && (
        <span className="absolute inset-y-0 right-3 flex max-w-14 items-center truncate text-[13px] text-zinc-500">{suffix}</span>
      )}
    </div>
  );
});

// ---------------- Select ----------------
export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ invalid, className, children, ...rest }, ref) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(controlBase, borderFor(invalid), 'h-9 appearance-none pr-9 pl-3', className)} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-zinc-500" aria-hidden />
    </div>
  );
});

// ---------------- Textarea ----------------
export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ invalid, className, ...rest }, ref) {
  return <textarea ref={ref} className={cn(controlBase, borderFor(invalid), 'min-h-24 px-3 py-2 leading-relaxed', className)} {...rest} />;
});

// ---------------- Checkbox ----------------
export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  description?: ReactNode;
  invalid?: boolean;
}

export function Checkbox({ label, description, className, id, invalid, ...rest }: CheckboxProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <input
        id={inputId}
        type="checkbox"
        className={cn(
          'mt-0.5 size-4 shrink-0 cursor-pointer rounded border-zinc-300 accent-ink-900',
          invalid && 'outline outline-red-500',
        )}
        {...rest}
      />
      <label htmlFor={inputId} className="cursor-pointer text-sm leading-5 text-zinc-700">
        {label}
        {description && <span className="block text-[13px] text-zinc-500">{description}</span>}
      </label>
    </div>
  );
}

// ---------------- Switch ----------------
interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  /** Hide the visible label (keeps aria-label). */
  hideLabel?: boolean;
}

export function Switch({ checked, onChange, label, disabled, hideLabel }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={hideLabel ? label : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className={cn('relative h-5 w-9 rounded-full transition-colors', checked ? 'bg-ink-900' : 'bg-zinc-300')}>
        <span
          className={cn(
            'absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform',
            checked && 'translate-x-4',
          )}
        />
      </span>
      {!hideLabel && <span className="text-sm text-zinc-700">{label}</span>}
    </button>
  );
}
