import { type ChangeEvent, type InputHTMLAttributes } from 'react';
import { Phone } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatEthiopianPhone } from '@/utils/validation';

export interface PhoneInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function PhoneInput({
  value,
  onChange,
  error,
  className,
  disabled,
  placeholder = '0911 234 567 or +251 91 123 4567',
  ...rest
}: PhoneInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatEthiopianPhone(raw);
    onChange(formatted);
  };

  return (
    <div className="relative w-full">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 gap-1.5 text-zinc-500">
        <span className="text-[11px] font-bold tracking-wider text-ink-700 bg-zinc-100 border border-zinc-200 px-1 py-0.5 rounded select-none">
          ET
        </span>
        <Phone className="size-3.5 text-zinc-400" />
      </div>

      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        className={cn(
          'h-10 w-full rounded-md border bg-white pl-15 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
            : 'border-zinc-300 focus:border-ink-900 focus:ring-ink-900/10',
          disabled && 'bg-zinc-100 text-zinc-400 cursor-not-allowed',
          className,
        )}
        {...rest}
      />
    </div>
  );
}
